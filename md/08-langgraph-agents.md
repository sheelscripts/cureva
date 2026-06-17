# CUREVA — LangGraph Agent System
### Prompt 08 of 20
### Role: Senior AI Systems Engineer

---

## ROLE

Senior AI systems engineer. Build complete Cureva multi-agent system.
LangGraph. Stateful. Typed state. Supervisor pattern.
Every agent self-contained in its own folder.
All decisions logged to Langfuse. All tools called via MCP only.
No direct DB access from agents — ever.

---

## ARCHITECTURE

```
Redis cancellation event
         ↓
runner.py (consumer)
         ↓
graph.py (LangGraph compiled graph)
         ↓
SupervisorAgent (routes to correct sub-agent)
         ↓
┌────────────────────────────────────────┐
│  PredictorAgent    → risk score        │
│  InterventionAgent → channel + message │
│  RecoveryAgent     → waitlist + book   │
│  EscalationAgent   → handoff payload   │
│  TriageAgent       → symptom → spec    │
│  ScribeAgent       → STT + SOAP        │
│  PrescriptionAgent → drug suggest      │
│  AuditAgent        → async scorer      │
└────────────────────────────────────────┘
```

---

## RULES (enforce always)

```
1. Agents NEVER call DB directly — MCP tools only
2. Every LLM call traced in Langfuse
3. Structured output via Instructor — no raw string parsing
4. Graceful degradation: if tool fails → log + continue with fallback
5. All agent outputs typed via Pydantic
6. State is immutable per step — agents return new state, never mutate
7. Confidence < 0.6 → escalate immediately, don't guess
8. Every session has audit_agent run async after close
```

---

## DEPENDENCIES

```bash
pip install langgraph langchain-core langchain-community \
  instructor anthropic ollama-python langfuse \
  fastmcp pydantic httpx --break-system-packages
```

---

## SHARED STATE

```python
# agents/state.py
from typing import TypedDict, Optional, Literal
from datetime import datetime
from pydantic import BaseModel


class WaitlistEntry(BaseModel):
    patient_id: str
    patient_name: str
    rank: int
    score: float
    wait_days: int
    distance_km: float
    channel: str
    message: Optional[str] = None
    response: Optional[str] = None
    responded_at: Optional[datetime] = None


class OutreachAttempt(BaseModel):
    patient_id: str
    channel: str
    message: str
    sent_at: datetime
    delivery_status: str = "sent"
    response: Optional[str] = None


class EscalationPayload(BaseModel):
    session_id: str
    slot: dict
    waitlist_contacted: int
    responses_received: int
    elapsed_minutes: float
    escalation_reason: str
    recommended_action: str
    top_patient: Optional[dict] = None
    handoff_timestamp: datetime


class AgentState(TypedDict):
    # ── session identity ──────────────────────────
    session_id: str
    event_type: Literal[
        "cancellation", "no_show", "triage_request",
        "scribe_request", "prescription_request", "scheduled_risk_run"
    ]
    created_at: str

    # ── slot + appointment ─────────────────────────
    slot_id: Optional[str]
    appointment_id: Optional[str]
    doctor_id: Optional[str]
    doctor_name: Optional[str]
    specialty: Optional[str]
    slot_time: Optional[str]
    value_inr: Optional[int]

    # ── patient ────────────────────────────────────
    patient_id: Optional[str]
    patient_name: Optional[str]
    patient_profile: Optional[dict]

    # ── risk scoring ───────────────────────────────
    risk_score: Optional[float]
    risk_tier: Optional[str]         # low | medium | high | critical
    risk_factors: Optional[list[str]]
    planned_intervention: Optional[str]

    # ── intervention ───────────────────────────────
    intervention_channel: Optional[str]
    intervention_message: Optional[str]
    intervention_sent: bool
    intervention_response: Optional[str]
    intervention_outcome: Optional[str]

    # ── recovery ───────────────────────────────────
    waitlist: Optional[list[WaitlistEntry]]
    outreach_attempts: Optional[list[OutreachAttempt]]
    recovery_outcome: Optional[str]    # recovered | escalated | lost
    filled_by_patient_id: Optional[str]
    fill_time_seconds: Optional[int]

    # ── triage ─────────────────────────────────────
    symptoms_raw: Optional[str]
    urgency: Optional[str]            # low | medium | high | critical
    recommended_specialty: Optional[str]
    triage_confidence: Optional[float]
    triage_reasoning: Optional[str]

    # ── scribe ─────────────────────────────────────
    transcript: Optional[str]
    soap_note: Optional[dict]          # {subjective, objective, assessment, plan}
    ai_alerts: Optional[list[str]]

    # ── prescription ───────────────────────────────
    diagnosis: Optional[str]
    suggested_medicines: Optional[list[dict]]
    drug_interactions: Optional[list[dict]]
    prescription_id: Optional[str]

    # ── escalation ─────────────────────────────────
    should_escalate: bool
    escalation_reason: Optional[str]
    escalation_payload: Optional[EscalationPayload]

    # ── control flow ───────────────────────────────
    next_agent: Optional[str]
    error: Optional[str]
    confidence: Optional[float]
    completed: bool

    # ── audit ──────────────────────────────────────
    agent_trace: list[dict]           # [{agent, started_at, ended_at, tokens, success}]
    langfuse_trace_id: Optional[str]
```

---

## LLM + TRACING SETUP

```python
# agents/llm.py
import instructor
from anthropic import Anthropic
from langfuse import Langfuse
from langfuse.decorators import observe
from app.config import settings

# Primary: Anthropic (Claude Sonnet 4.6)
# Fallback: Ollama (qwen3 local)

anthropic_client = Anthropic()
instructor_client = instructor.from_anthropic(anthropic_client)

langfuse = Langfuse(
    secret_key=settings.LANGFUSE_SECRET_KEY,
    public_key=settings.LANGFUSE_PUBLIC_KEY,
)


def get_llm_client():
    """Returns Instructor-wrapped client. Swappable."""
    return instructor_client


async def call_llm(
    prompt: str,
    response_model,
    system: str = "",
    session_id: str = "",
    agent_name: str = "",
    max_retries: int = 3,
):
    """
    Central LLM call. All agents go through here.
    Logs to Langfuse. Returns typed Pydantic model.
    Graceful degradation: returns None on failure after retries.
    """
    generation = langfuse.generation(
        name=f"{agent_name}_call",
        model="claude-sonnet-4-6",
        input={"system": system, "prompt": prompt},
        session_id=session_id,
    )

    try:
        result = instructor_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            response_model=response_model,
            max_retries=max_retries,
        )
        generation.end(
            output=result.model_dump(),
            usage={"input": 0, "output": 0},   # populate from response headers
            level="DEFAULT",
        )
        return result

    except Exception as e:
        generation.end(level="ERROR", status_message=str(e))
        return None
```

---

## SUPERVISOR AGENT

```python
# agents/supervisor/agent.py
from langgraph.graph import StateGraph, END
from agents.state import AgentState


def supervisor_node(state: AgentState) -> AgentState:
    """
    Routes event to correct first agent.
    Pure logic — no LLM call. Deterministic.
    """
    event = state["event_type"]

    route_map = {
        "cancellation":       "recovery",
        "no_show":            "recovery",
        "scheduled_risk_run": "predictor",
        "triage_request":     "triage",
        "scribe_request":     "scribe",
        "prescription_request": "prescription",
    }

    next_agent = route_map.get(event, "escalation")

    trace_entry = {
        "agent": "supervisor",
        "started_at": __import__("datetime").datetime.utcnow().isoformat(),
        "decision": next_agent,
        "success": True,
    }

    return {
        **state,
        "next_agent": next_agent,
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }


def route_after_supervisor(state: AgentState) -> str:
    return state.get("next_agent", "escalation")
```

---

## PREDICTOR AGENT

```python
# agents/predictor/agent.py
"""
Scores no-show risk for a given appointment.
Uses XGBoost model via predict.py — NOT an LLM call.
LLM only for generating plain-English explanation of top factors.
"""
import time
from datetime import datetime
from agents.state import AgentState
from agents.llm import call_llm
from agents.predictor.tools import get_patient_features, call_risk_scorer
from pydantic import BaseModel


class RiskExplanation(BaseModel):
    top_factors: list[str]      # max 3, plain English
    recommended_intervention: str  # sms | whatsapp | voice_call


async def predictor_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]
    appointment_id = state["appointment_id"]

    try:
        # 1. Get features from Patient MCP
        features = await get_patient_features(appointment_id)
        if not features:
            return {**state, "error": "predictor: could not fetch patient features",
                    "should_escalate": True, "escalation_reason": "feature_fetch_failed"}

        # 2. Score via XGBoost (not LLM)
        score_result = await call_risk_scorer(features)
        score = score_result["score"]
        tier = score_result["tier"]

        # 3. LLM explains top factors in plain English
        explanation = await call_llm(
            prompt=f"""
Features that contributed to this patient's no-show risk score of {score:.2f}:
{features}

List the top 3 most important factors in plain English (one sentence each).
Also recommend the intervention channel based on risk tier: {tier}
""",
            response_model=RiskExplanation,
            system="You are a clinical risk explainer. Be specific and factual. No medical advice.",
            session_id=session_id,
            agent_name="predictor",
        )

        # 4. Determine channel from tier (deterministic fallback if LLM fails)
        channel_map = {
            "low": "sms",
            "medium": "whatsapp",
            "high": "voice_call",
            "critical": "voice_call",
        }
        channel = (
            explanation.recommended_intervention
            if explanation else channel_map.get(tier, "sms")
        )

        trace_entry = {
            "agent": "predictor",
            "started_at": datetime.utcfromtimestamp(started).isoformat(),
            "ended_at": datetime.utcnow().isoformat(),
            "success": True,
            "latency_ms": int((time.time() - started) * 1000),
        }

        # 5. Route: high/critical → intervention, low → store + done
        next_agent = "intervention" if tier in ("high", "critical", "medium") else END

        return {
            **state,
            "risk_score": score,
            "risk_tier": tier,
            "risk_factors": explanation.top_factors if explanation else score_result.get("top_factors", []),
            "planned_intervention": channel,
            "next_agent": next_agent,
            "agent_trace": state.get("agent_trace", []) + [trace_entry],
        }

    except Exception as e:
        return {**state, "error": f"predictor: {e}", "should_escalate": True,
                "escalation_reason": "predictor_exception"}


# agents/predictor/tools.py
from mcp import ClientSession
import httpx

async def get_patient_features(appointment_id: str) -> dict | None:
    """Calls Patient MCP + Appointment MCP to build feature vector."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"http://localhost:8001/tools/get_appointment_features",
                params={"appointment_id": appointment_id},
                timeout=5.0,
            )
            res.raise_for_status()
            return res.json()
    except Exception:
        return None


async def call_risk_scorer(features: dict) -> dict:
    """Calls ML service — XGBoost predict.py."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "http://localhost:8002/predict",
            json=features,
            timeout=3.0,
        )
        res.raise_for_status()
        return res.json()
        # Returns: { score: float, tier: str, top_factors: list[str] }
```

---

## INTERVENTION AGENT

```python
# agents/intervention/agent.py
"""
Selects outreach channel based on risk tier.
Generates personalized message per patient using LLM.
Sends via Notification MCP.
Monitors for response within time window.
"""
import time
from datetime import datetime
from pydantic import BaseModel
from agents.state import AgentState
from agents.llm import call_llm
from agents.intervention.tools import (
    send_sms, send_whatsapp, initiate_call, check_response
)


class OutreachMessage(BaseModel):
    message: str            # under 160 chars for SMS, 300 for WA
    tone: str               # urgent | friendly | informational
    personalization_score: float  # 0-1, for eval


CHANNEL_COST = {"sms": 0.08, "whatsapp": 0.15, "voice_call": 2.50}


async def intervention_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]
    patient_profile = state.get("patient_profile", {})
    risk_tier = state.get("risk_tier", "medium")
    channel = state.get("planned_intervention", "whatsapp")

    # Generate personalized message
    outreach = await call_llm(
        prompt=f"""
Generate a personalized outreach message for this patient:

Patient: {patient_profile.get('name', 'Patient')}
Waiting days: {patient_profile.get('wait_days', 0)}
Distance from clinic: {patient_profile.get('distance_km', 0)}km
Appointment: {state.get('slot_time')} with {state.get('doctor_name')}
Specialty: {state.get('specialty')}
Risk tier: {risk_tier}
Channel: {channel}
Preferred language: {patient_profile.get('preferred_language', 'english')}

Rules:
- Under 160 chars if channel is sms
- Under 300 chars if channel is whatsapp
- Lead with the most relevant motivation for THIS patient
- If wait_days > 14: lead with wait time
- If distance_km < 5: lead with proximity
- Never mention other patients or cancellations
- End with clear CTA: "Reply YES to confirm"
- If preferred language is hindi: use Hinglish (Hindi in English script)
""",
        response_model=OutreachMessage,
        system="""You are SlotSaver, the appointment recovery assistant for Cureva clinic.
Generate warm, specific, non-spammy outreach messages.
Never say "AI" or "automated". Never mention the original patient cancelled.""",
        session_id=session_id,
        agent_name="intervention",
    )

    if not outreach:
        # Fallback message — deterministic
        outreach = OutreachMessage(
            message=f"Hi, an appointment slot is available with {state.get('doctor_name')} today. Reply YES to book.",
            tone="friendly",
            personalization_score=0.0,
        )

    # Send via correct channel
    send_fn = {"sms": send_sms, "whatsapp": send_whatsapp, "voice_call": initiate_call}
    sent = await send_fn.get(channel, send_whatsapp)(
        patient_id=state["patient_id"],
        message=outreach.message,
        session_id=session_id,
    )

    # Wait for response (poll for up to 2 min for intervention flow)
    # Recovery agent handles longer wait for recovery sessions
    response = await check_response(state["patient_id"], timeout_seconds=120)

    outcome = "no_response"
    next_agent = "recovery"     # default: move to recovery regardless

    if response:
        resp_lower = response.lower().strip()
        if any(w in resp_lower for w in ["yes","confirm","ok","haan","ha","sure"]):
            outcome = "confirmed"
            next_agent = END    # intervention succeeded — no recovery needed
        elif any(w in resp_lower for w in ["no","cancel","nahi","reschedule"]):
            outcome = "declined"
            # Recovery still fires — find replacement

    trace_entry = {
        "agent": "intervention",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "channel": channel,
        "outcome": outcome,
        "latency_ms": int((time.time() - started) * 1000),
        "success": sent,
    }

    return {
        **state,
        "intervention_channel": channel,
        "intervention_message": outreach.message,
        "intervention_sent": sent,
        "intervention_response": response,
        "intervention_outcome": outcome,
        "next_agent": next_agent,
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }
```

---

## RECOVERY AGENT

```python
# agents/recovery/agent.py
"""
Core revenue recovery engine.
Ranks waitlist → sends personalized outreach to top 3 → books first confirmation.
Monitors all responses in parallel. Escalates on timeout.
"""
import asyncio
import time
from datetime import datetime
from pydantic import BaseModel
from agents.state import AgentState, WaitlistEntry, OutreachAttempt
from agents.llm import call_llm
from agents.recovery.tools import (
    score_waitlist, send_outreach_batch,
    book_slot, release_slot, notify_others
)

ESCALATION_THRESHOLD_SECONDS = 900   # 15 minutes


class PersonalizedMessages(BaseModel):
    messages: list[dict]   # [{patient_id, message, channel}]


async def recovery_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]
    slot_id = state["slot_id"]

    # 1. Get ranked waitlist from Waitlist MCP
    ranked = await score_waitlist(
        slot_id=slot_id,
        specialty=state.get("specialty"),
        doctor_id=state.get("doctor_id"),
    )

    if not ranked:
        return {
            **state,
            "recovery_outcome": "escalated",
            "escalation_reason": "empty_waitlist",
            "should_escalate": True,
        }

    top3 = ranked[:3]

    # 2. Generate personalized message per patient
    messages_result = await call_llm(
        prompt=f"""
Generate personalized outreach messages for these 3 patients.
Slot: {state.get('slot_time')} with {state.get('doctor_name')} ({state.get('specialty')})
Value: ₹{state.get('value_inr')}

Patients (ranked by likelihood to accept):
{[{
    'name': p.patient_name,
    'wait_days': p.wait_days,
    'distance_km': p.distance_km,
    'channel': p.channel,
    'rank': p.rank,
} for p in top3]}

For each patient:
- Lead with their strongest motivation (wait_days > 14 → time waited, distance < 5 → proximity)
- Match message length to channel (SMS: <160, WhatsApp: <300)
- End with: "Reply YES to confirm."
- Different message per patient — never copy-paste

Return: messages array with patient_id, message, channel for each.
""",
        response_model=PersonalizedMessages,
        system="You are SlotSaver recovery assistant. Generate specific, warm, non-generic messages.",
        session_id=session_id,
        agent_name="recovery",
    )

    # Fallback messages if LLM fails
    if not messages_result:
        messages_result = PersonalizedMessages(messages=[
            {"patient_id": p.patient_id,
             "message": f"Hi {p.patient_name.split()[0]}, a slot with {state.get('doctor_name')} is available. Reply YES.",
             "channel": p.channel}
            for p in top3
        ])

    # 3. Send all outreach in parallel
    attempts = await send_outreach_batch(messages_result.messages, session_id)

    # 4. Poll for responses — race condition: first YES wins
    confirmed_patient = None
    elapsed = 0
    poll_interval = 10   # seconds

    while elapsed < ESCALATION_THRESHOLD_SECONDS:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

        for attempt in attempts:
            response = attempt.get("response")
            if response and any(
                w in response.lower()
                for w in ["yes","confirm","ok","haan","ha","sure"]
            ):
                confirmed_patient = attempt["patient_id"]
                break

        if confirmed_patient:
            break

    # 5. Outcome
    if confirmed_patient:
        # Book slot + notify others
        fill_time = int(time.time() - started)
        await book_slot(
            patient_id=confirmed_patient,
            slot_id=slot_id,
            session_id=session_id,
        )
        other_ids = [p.patient_id for p in top3 if p.patient_id != confirmed_patient]
        await notify_others(other_ids, slot_filled=True)

        outcome = "recovered"
        should_escalate = False
        escalation_reason = None

    else:
        # Nobody responded — escalate
        fill_time = None
        outcome = "escalated"
        should_escalate = True
        escalation_reason = "no_response_timeout"

    trace_entry = {
        "agent": "recovery",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "outcome": outcome,
        "patients_contacted": len(top3),
        "fill_time_seconds": fill_time,
        "latency_ms": int((time.time() - started) * 1000),
        "success": outcome == "recovered",
    }

    return {
        **state,
        "waitlist": top3,
        "outreach_attempts": [OutreachAttempt(**a) for a in attempts],
        "recovery_outcome": outcome,
        "filled_by_patient_id": confirmed_patient,
        "fill_time_seconds": fill_time,
        "should_escalate": should_escalate,
        "escalation_reason": escalation_reason,
        "next_agent": "escalation" if should_escalate else "audit",
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }
```

---

## ESCALATION AGENT

```python
# agents/escalation/agent.py
"""
Formats handoff payload. Notifies front desk.
Never guesses — always provides clear recommended action.
"""
import time
from datetime import datetime
from agents.state import AgentState, EscalationPayload
from agents.escalation.tools import notify_frontdesk, create_escalation_record


async def escalation_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]

    top_patient = None
    if state.get("waitlist") and len(state["waitlist"]) > 0:
        top = state["waitlist"][0]
        top_patient = {
            "name": top.patient_name,
            "patient_id": top.patient_id,
            "wait_days": top.wait_days,
        }

    reason = state.get("escalation_reason", "unknown")

    reason_messages = {
        "no_response_timeout": "3 patients contacted. No responses in 15 minutes.",
        "empty_waitlist":      "No waitlisted patients found for this specialty.",
        "all_declined":        "All contacted patients declined.",
        "low_confidence":      "Agent confidence below threshold.",
        "feature_fetch_failed":"Could not fetch patient data.",
        "predictor_exception": "Risk scoring failed.",
    }

    payload = EscalationPayload(
        session_id=session_id,
        slot={
            "slot_id": state.get("slot_id"),
            "slot_time": state.get("slot_time"),
            "doctor_name": state.get("doctor_name"),
            "specialty": state.get("specialty"),
            "value_inr": state.get("value_inr"),
        },
        waitlist_contacted=len(state.get("outreach_attempts", [])),
        responses_received=sum(
            1 for a in (state.get("outreach_attempts") or [])
            if a.response is not None
        ),
        elapsed_minutes=round(
            (time.time() - __import__("datetime").datetime.fromisoformat(
                state["created_at"]
            ).timestamp()) / 60, 1
        ),
        escalation_reason=reason,
        recommended_action=(
            f"Call {top_patient['name']} manually — waited {top_patient['wait_days']} days"
            if top_patient else "Review waitlist manually"
        ),
        top_patient=top_patient,
        handoff_timestamp=datetime.utcnow(),
    )

    # Notify via Notification MCP
    await notify_frontdesk(payload, session_id)

    # Persist escalation record
    await create_escalation_record(payload, session_id)

    trace_entry = {
        "agent": "escalation",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "reason": reason,
        "success": True,
        "latency_ms": int((time.time() - started) * 1000),
    }

    return {
        **state,
        "escalation_payload": payload,
        "next_agent": "audit",
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }
```

---

## TRIAGE AGENT

```python
# agents/triage/agent.py
"""
Maps patient-reported symptoms → specialty + urgency.
Grounded in Knowledge MCP (clinical guidelines RAG).
NEVER diagnoses. Only routes.
Safety rule: when in doubt, escalate urgency.
"""
import time
from datetime import datetime
from pydantic import BaseModel
from agents.state import AgentState
from agents.llm import call_llm
from agents.triage.tools import retrieve_symptom_pathway, retrieve_red_flags


class TriageResult(BaseModel):
    urgency: str                    # low | medium | high | critical
    recommended_specialty: str
    confidence: float               # 0-1
    reasoning: str                  # one sentence, plain English
    escalate_immediately: bool
    suggested_message: str          # what to tell patient
    red_flags_detected: list[str]   # symptoms that triggered urgency


async def triage_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]
    symptoms = state.get("symptoms_raw", "")

    # 1. Retrieve clinical pathways from Knowledge MCP (RAG)
    pathway = await retrieve_symptom_pathway(symptoms)
    red_flags = await retrieve_red_flags(symptoms)

    # 2. LLM triage with RAG context
    result = await call_llm(
        prompt=f"""
Patient description: "{symptoms}"

Clinical pathway context:
{pathway or "No specific pathway retrieved. Use general medical knowledge."}

Known red flags for these symptom patterns:
{red_flags or "No specific red flags retrieved."}

Determine:
1. Urgency level (low/medium/high/critical)
2. Most appropriate medical specialty
3. Whether to escalate immediately (true if any red flags present)
4. What to tell the patient

SAFETY RULES:
- If ANY cardiac symptoms (chest pain, jaw pain, left arm pain, shortness of breath): urgency = high minimum
- If altered consciousness, severe bleeding, stroke symptoms: urgency = critical
- When uncertain between medium/high: choose high
- Never say "it's probably nothing"
- Never diagnose — only route
""",
        response_model=TriageResult,
        system="""You are a medical triage assistant at an Indian clinic.
You route patients to the correct specialty based on symptoms.
You are NOT a doctor. You do NOT diagnose. You route and escalate when needed.
When in doubt about severity: escalate. Never minimize symptoms.
All output in English unless patient wrote in Hindi — then use Hinglish.""",
        session_id=session_id,
        agent_name="triage",
    )

    if not result:
        # Fallback: safe default — general medicine, medium urgency
        result = TriageResult(
            urgency="medium",
            recommended_specialty="General Medicine",
            confidence=0.0,
            reasoning="Could not process symptoms. Defaulting to general medicine.",
            escalate_immediately=False,
            suggested_message="Please visit our general medicine department for evaluation.",
            red_flags_detected=[],
        )

    trace_entry = {
        "agent": "triage",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "urgency": result.urgency,
        "specialty": result.recommended_specialty,
        "confidence": result.confidence,
        "latency_ms": int((time.time() - started) * 1000),
        "success": True,
    }

    return {
        **state,
        "urgency": result.urgency,
        "recommended_specialty": result.recommended_specialty,
        "triage_confidence": result.confidence,
        "triage_reasoning": result.reasoning,
        "should_escalate": result.escalate_immediately,
        "escalation_reason": "red_flag_detected" if result.escalate_immediately else None,
        "next_agent": "escalation" if result.escalate_immediately else END,
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
        "completed": not result.escalate_immediately,
    }
```

---

## AUDIT AGENT

```python
# agents/audit/agent.py
"""
Runs async after every session closes.
Scores decision quality, message appropriateness, tool accuracy, outcome.
Writes to eval_results. Flags anomalies.
"""
import time
from datetime import datetime
from pydantic import BaseModel
from agents.state import AgentState
from agents.llm import call_llm
from agents.audit.tools import write_eval_results, flag_anomaly


class SessionScore(BaseModel):
    decision_quality: float          # 0-1: did agents make correct decisions?
    message_appropriateness: float   # 0-1: were outreach messages appropriate?
    tool_accuracy: float             # 0-1: did tools return expected results?
    escalation_correctness: float    # 0-1: was escalation decision correct?
    overall: float                   # weighted average


async def audit_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]

    # Build context for LLM scorer
    outreach_msgs = [
        a.message for a in (state.get("outreach_attempts") or [])
    ]

    score = await call_llm(
        prompt=f"""
Score this completed agent session:

Session: {session_id}
Event type: {state.get('event_type')}
Risk tier: {state.get('risk_tier')}
Outcome: {state.get('recovery_outcome')}
Fill time: {state.get('fill_time_seconds')}s
Escalated: {state.get('should_escalate')}
Escalation reason: {state.get('escalation_reason')}

Agent trace:
{state.get('agent_trace', [])}

Outreach messages sent:
{outreach_msgs}

Score each dimension 0-1:
1. decision_quality: Were routing and channel decisions appropriate for the risk level?
2. message_appropriateness: Were messages personalized, appropriate tone, clear CTA?
3. tool_accuracy: Did all tool calls succeed? (check agent_trace for errors)
4. escalation_correctness: If escalated, was it the right call? If not, should it have?
5. overall: Weighted average (decision_quality 0.3, message 0.25, tools 0.25, escalation 0.2)
""",
        response_model=SessionScore,
        system="You are a quality auditor for an AI agent system. Be precise and strict.",
        session_id=session_id,
        agent_name="audit",
    )

    if not score:
        score = SessionScore(
            decision_quality=0.5, message_appropriateness=0.5,
            tool_accuracy=1.0, escalation_correctness=0.5, overall=0.5
        )

    # Write to DB via Analytics MCP
    await write_eval_results(session_id, score.model_dump())

    # Flag if overall score is very low
    if score.overall < 0.4:
        await flag_anomaly(session_id, score.model_dump(), state)

    trace_entry = {
        "agent": "audit",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "overall_score": score.overall,
        "success": True,
        "latency_ms": int((time.time() - started) * 1000),
    }

    return {
        **state,
        "completed": True,
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }
```

---

## GRAPH ASSEMBLY

```python
# agents/graph.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from agents.state import AgentState
from agents.supervisor.agent import supervisor_node, route_after_supervisor
from agents.predictor.agent import predictor_node
from agents.intervention.agent import intervention_node
from agents.recovery.agent import recovery_node
from agents.escalation.agent import escalation_node
from agents.triage.agent import triage_node
from agents.audit.agent import audit_node


def build_graph() -> StateGraph:
    builder = StateGraph(AgentState)

    # Add all nodes
    builder.add_node("supervisor",   supervisor_node)
    builder.add_node("predictor",    predictor_node)
    builder.add_node("intervention", intervention_node)
    builder.add_node("recovery",     recovery_node)
    builder.add_node("escalation",   escalation_node)
    builder.add_node("triage",       triage_node)
    builder.add_node("audit",        audit_node)

    # Entry point
    builder.set_entry_point("supervisor")

    # Supervisor routes conditionally
    builder.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "predictor":    "predictor",
            "recovery":     "recovery",
            "triage":       "triage",
            "escalation":   "escalation",
        },
    )

    # Predictor → intervention (if high/critical) or audit
    builder.add_conditional_edges(
        "predictor",
        lambda s: s.get("next_agent", "audit"),
        {"intervention": "intervention", "audit": "audit", END: END},
    )

    # Intervention → recovery or end
    builder.add_conditional_edges(
        "intervention",
        lambda s: s.get("next_agent", "recovery"),
        {"recovery": "recovery", END: END},
    )

    # Recovery → escalation or audit
    builder.add_conditional_edges(
        "recovery",
        lambda s: "escalation" if s.get("should_escalate") else "audit",
        {"escalation": "escalation", "audit": "audit"},
    )

    # Triage → escalation or end
    builder.add_conditional_edges(
        "triage",
        lambda s: "escalation" if s.get("should_escalate") else END,
        {"escalation": "escalation", END: END},
    )

    # Terminal nodes → audit (async)
    builder.add_edge("escalation", "audit")
    builder.add_edge("audit", END)

    # Checkpointing — survives restarts
    checkpointer = SqliteSaver.from_conn_string("checkpoints.db")

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
```

---

## RUNNER (Redis Consumer)

```python
# agents/runner.py
"""
Consumes events from Redis streams.
Dispatches to LangGraph graph.
Runs as separate process alongside FastAPI.
"""
import asyncio
import json
import uuid
from datetime import datetime
from agents.graph import graph
from agents.state import AgentState
from app.utils.redis import get_redis


STREAMS = {
    "cancellation_events":  "cancellation",
    "triage_requests":      "triage_request",
    "scheduled_risk_runs":  "scheduled_risk_run",
    "scribe_requests":      "scribe_request",
    "prescription_requests": "prescription_request",
}

CONSUMER_GROUP = "cureva-agents"
CONSUMER_NAME  = f"agent-runner-{uuid.uuid4().hex[:8]}"


async def consume():
    redis = await get_redis()

    # Create consumer groups if not exist
    for stream in STREAMS:
        try:
            await redis.xgroup_create(stream, CONSUMER_GROUP, id="0", mkstream=True)
        except Exception:
            pass  # Group already exists

    print(f"[runner] Agent runner started. Consumer: {CONSUMER_NAME}")

    while True:
        try:
            # Read from all streams
            messages = await redis.xreadgroup(
                CONSUMER_GROUP, CONSUMER_NAME,
                streams={s: ">" for s in STREAMS},
                count=5,
                block=1000,    # 1s timeout
            )

            for stream_name, entries in (messages or []):
                event_type = STREAMS[stream_name]

                for entry_id, fields in entries:
                    data = json.loads(fields.get("data", "{}"))
                    session_id = str(uuid.uuid4())

                    # Build initial state
                    initial_state: AgentState = {
                        "session_id": session_id,
                        "event_type": event_type,
                        "created_at": datetime.utcnow().isoformat(),
                        "slot_id": data.get("slot_id"),
                        "appointment_id": data.get("appointment_id"),
                        "doctor_id": data.get("doctor_id"),
                        "doctor_name": data.get("doctor_name"),
                        "specialty": data.get("specialty"),
                        "slot_time": data.get("slot_time"),
                        "value_inr": data.get("value_inr"),
                        "patient_id": data.get("patient_id"),
                        "patient_name": data.get("patient_name"),
                        "patient_profile": data.get("patient_profile"),
                        "symptoms_raw": data.get("symptoms_raw"),
                        "transcript": data.get("transcript"),
                        "diagnosis": data.get("diagnosis"),
                        "should_escalate": False,
                        "intervention_sent": False,
                        "completed": False,
                        "agent_trace": [],
                        # all others None
                    }

                    print(f"[runner] Processing {event_type} | session={session_id}")

                    try:
                        # Run graph (async)
                        await asyncio.wait_for(
                            run_graph(initial_state, session_id),
                            timeout=300,    # 5 min max per session
                        )
                        # Acknowledge message
                        await redis.xack(stream_name, CONSUMER_GROUP, entry_id)

                    except asyncio.TimeoutError:
                        print(f"[runner] TIMEOUT: session={session_id}")
                        await redis.xack(stream_name, CONSUMER_GROUP, entry_id)

                    except Exception as e:
                        print(f"[runner] ERROR: session={session_id} | {e}")
                        # Don't ack — let it retry up to 3 times

        except Exception as e:
            print(f"[runner] Stream read error: {e}")
            await asyncio.sleep(5)


async def run_graph(state: AgentState, session_id: str):
    config = {"configurable": {"thread_id": session_id}}
    async for step in graph.astream(state, config=config):
        agent_name = list(step.keys())[0]
        print(f"[graph] step={agent_name} | session={session_id}")


if __name__ == "__main__":
    asyncio.run(consume())
```

---

## STARTUP

```bash
# Terminal 1 — FastAPI
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Agent runner
python -m agents.runner

# Terminal 3 — Celery worker (PDF + notifications)
celery -A app.workers.celery_app worker --loglevel=info

# Trigger test event
python - <<'EOF'
import asyncio, json
from app.utils.redis import get_redis

async def trigger():
    redis = await get_redis()
    await redis.xadd("cancellation_events", {
        "data": json.dumps({
            "slot_id": "SLOT-001",
            "appointment_id": "A-8821",
            "doctor_id": "D-001",
            "doctor_name": "Dr. Sharma",
            "specialty": "Cardiology",
            "slot_time": "2025-01-16T16:00:00",
            "value_inr": 1500,
        })
    })
    print("Event published")

asyncio.run(trigger())
EOF
```

---

## RULES

```
1. Every node returns full state — never partial update
2. Confidence < 0.6 on any agent → should_escalate = True
3. LLM failure → fallback to deterministic logic, never crash
4. All MCP calls wrapped in try/except — tool failure != session failure
5. audit_node always runs — even if session errors
6. graph.astream() not .invoke() — visibility into each step
7. Redis XACK only after successful processing — failed = retry
8. Timeout 300s per session — prevents zombie sessions
9. Checkpointer saves state after each node — survives process restart
10. Langfuse trace wraps entire session — one trace_id per session_id
```
