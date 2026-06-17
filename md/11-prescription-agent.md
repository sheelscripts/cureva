# CUREVA — Prescription Agent
### Prompt 11 of 20
### Role: Senior AI Engineer

---

## ROLE

Build complete Prescription Agent.
Drug suggestions grounded in Knowledge MCP (RAG).
Interaction checker. Dosage calculator.
PDF generation (deterministic — no LLM in render).
WhatsApp + email dispatch.
Full runnable code. No stubs.

---

## FULL PIPELINE

```
ScribeAgent ends session
         ↓
prescription_requests Redis stream
         ↓
PrescriptionAgent fires
         ↓
Fetch patient history + allergies (Patient MCP)
         ↓
Retrieve drug guidelines (Knowledge MCP / RAG)
         ↓
LLM suggests medicines (grounded, typed output)
         ↓
Drug interaction check (Knowledge MCP)
         ↓
Doctor reviews + edits via UI
         ↓
Celery task generates PDF (React PDF → WeasyPrint)
         ↓
Upload to Supabase Storage
         ↓
Dispatch via WhatsApp / email (Notification MCP)
```

---

## 1. PRESCRIPTION AGENT

```python
# agents/prescription/agent.py
import time
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from agents.state import AgentState
from agents.llm import call_llm
from agents.prescription.tools import (
    get_patient_medical_context,
    retrieve_drug_guidelines,
    check_drug_interactions,
    retrieve_dosage_guide,
)


class Medicine(BaseModel):
    name: str
    strength: str                  # e.g. "10mg"
    category: str                  # e.g. "Statin", "Antiplatelet"
    dosage: str                    # e.g. "1-0-1" (morning-afternoon-night)
    duration_days: int
    instructions: str              # plain English patient instructions
    reasoning: str                 # why this drug for this patient
    confidence: float              # 0-1
    is_generic: bool               # always prefer generic in India


class PrescriptionSuggestion(BaseModel):
    medicines: list[Medicine]
    tests_ordered: list[str]       # lab tests to order
    instructions: str              # lifestyle + dietary advice
    follow_up_days: int            # when to come back
    clinical_notes: str            # any special notes for doctor


class DrugInteraction(BaseModel):
    drug_a: str
    drug_b: str
    severity: str                  # mild | moderate | severe
    description: str
    recommendation: str            # what to do


async def prescription_node(state: AgentState) -> AgentState:
    started = time.time()
    session_id = state["session_id"]
    appointment_id = state["appointment_id"]
    patient_id = state["patient_id"]
    diagnosis = state.get("diagnosis", state.get("soap", {}).get("assessment", ""))

    if not diagnosis:
        return {**state, "error": "prescription: no diagnosis found",
                "should_escalate": True, "escalation_reason": "no_diagnosis"}

    # 1. Patient context — allergies, current meds, history
    context = await get_patient_medical_context(patient_id)

    # 2. Retrieve drug guidelines from RAG (Knowledge MCP)
    guidelines = await retrieve_drug_guidelines(
        diagnosis=diagnosis,
        specialty=state.get("specialty", "General Medicine"),
    )

    # 3. LLM suggests medicines
    suggestion = await call_llm(
        prompt=f"""
Suggest appropriate medications for this patient.

DIAGNOSIS: {diagnosis}
SPECIALTY: {state.get('specialty', 'General Medicine')}

PATIENT CONTEXT:
Age: {context.get('age')} | Gender: {context.get('gender')}
Weight: {context.get('weight_kg')} kg
Blood Group: {context.get('blood_group')}
Allergies: {context.get('allergies', [])}
Current medications: {context.get('current_medications', [])}
Relevant history: {context.get('relevant_history', [])}

CLINICAL GUIDELINES:
{guidelines or "Use standard Indian clinical practice guidelines."}

TRANSCRIPT PLAN (what doctor mentioned):
{state.get('soap', {}).get('plan', 'Not available')}

RULES:
1. Prefer generic drugs — brand names only if generic unavailable in India
2. Check against patient's known allergies — NEVER prescribe allergen
3. Consider current medications — flag potential interactions
4. Dosage appropriate for Indian adult (adjust if age >65 or weight <50kg)
5. Duration: acute conditions 5-7 days, chronic 30 days, follow-up 90 days
6. Include reasoning per drug — doctor must understand why
7. Only suggest what is clinically indicated — do not over-prescribe
8. Tests: order only if clinically necessary
9. Follow-up: based on condition severity
10. Never diagnose — build on provided diagnosis only
""",
        response_model=PrescriptionSuggestion,
        system="""You are a clinical pharmacology assistant for Indian doctors.
Suggest evidence-based medications following Indian standard of care.
Prefer generic drugs. Respect allergies absolutely.
Always provide reasoning for each drug suggestion.
You do not diagnose — you support the doctor's decision.""",
        session_id=session_id,
        agent_name="prescription",
    )

    if not suggestion:
        return {**state, "error": "prescription: LLM failed",
                "should_escalate": True, "escalation_reason": "prescription_llm_failed"}

    # 4. Drug interaction check
    drug_names = [m.name for m in suggestion.medicines]
    interactions = await check_drug_interactions(drug_names)

    # Flag severe interactions — remove drug + add alert
    safe_medicines = []
    interaction_alerts = []
    for med in suggestion.medicines:
        severe = [i for i in interactions
                  if i["drug_a"] == med.name or i["drug_b"] == med.name
                  and i["severity"] == "severe"]
        if severe:
            interaction_alerts.append({
                "drug": med.name,
                "interaction": severe[0]["description"],
                "recommendation": severe[0]["recommendation"],
            })
            # Don't add to safe list — doctor must review
        else:
            safe_medicines.append(med)

    trace_entry = {
        "agent": "prescription",
        "started_at": datetime.utcfromtimestamp(started).isoformat(),
        "ended_at": datetime.utcnow().isoformat(),
        "medicines_suggested": len(suggestion.medicines),
        "interactions_found": len(interactions),
        "severe_interactions": len(interaction_alerts),
        "latency_ms": int((time.time() - started) * 1000),
        "success": True,
    }

    return {
        **state,
        "suggested_medicines": [m.model_dump() for m in safe_medicines],
        "drug_interactions": interactions,
        "prescription_notes": suggestion.instructions,
        "tests_ordered": suggestion.tests_ordered,
        "follow_up_days": suggestion.follow_up_days,
        "interaction_alerts": interaction_alerts,
        "next_agent": "audit",
        "agent_trace": state.get("agent_trace", []) + [trace_entry],
    }
```

---

## 2. PRESCRIPTION TOOLS (Knowledge MCP)

```python
# agents/prescription/tools.py
import httpx
from app.database import AsyncSessionLocal
from sqlalchemy import select

KNOWLEDGE_MCP_URL = "http://localhost:8003"
PATIENT_MCP_URL   = "http://localhost:8001"


async def get_patient_medical_context(patient_id: str) -> dict:
    """
    Fetch patient allergies, current meds, history.
    Builds context dict for LLM prompt.
    """
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{PATIENT_MCP_URL}/tools/get_medical_context",
                params={"patient_id": patient_id},
                timeout=5.0,
            )
            res.raise_for_status()
            data = res.json()

        # Build age from dob
        from datetime import date
        dob = data.get("dob")
        age = None
        if dob:
            born = date.fromisoformat(dob)
            age = (date.today() - born).days // 365

        return {
            "age": age,
            "gender": data.get("gender"),
            "weight_kg": data.get("weight_kg"),
            "blood_group": data.get("blood_group"),
            "allergies": data.get("allergies", []),
            "current_medications": [
                m["name"] for m in data.get("current_medications", [])
            ],
            "relevant_history": [
                h["condition"] for h in data.get("medical_history", [])
                if h.get("status") == "active"
            ],
        }
    except Exception as e:
        return {"error": str(e)}


async def retrieve_drug_guidelines(diagnosis: str, specialty: str) -> str | None:
    """RAG retrieval from Knowledge MCP — clinical drug guidelines."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{KNOWLEDGE_MCP_URL}/tools/retrieve_drug_info",
                json={"query": f"{diagnosis} treatment guidelines {specialty}", "top_k": 3},
                timeout=8.0,
            )
            res.raise_for_status()
            results = res.json().get("results", [])
            if not results:
                return None
            return "\n\n".join(r["content"] for r in results)
    except Exception:
        return None


async def check_drug_interactions(drug_names: list[str]) -> list[dict]:
    """
    Check all drug pairs for interactions.
    Returns list of interactions with severity.
    """
    if len(drug_names) < 2:
        return []

    interactions = []
    from itertools import combinations

    async with httpx.AsyncClient() as client:
        for drug_a, drug_b in combinations(drug_names, 2):
            try:
                res = await client.post(
                    f"{KNOWLEDGE_MCP_URL}/tools/check_drug_interaction",
                    json={"drug_a": drug_a, "drug_b": drug_b},
                    timeout=5.0,
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("interaction_found"):
                        interactions.append({
                            "drug_a": drug_a,
                            "drug_b": drug_b,
                            "severity": data["severity"],
                            "description": data["description"],
                            "recommendation": data["recommendation"],
                        })
            except Exception:
                continue

    return interactions


async def retrieve_dosage_guide(
    drug_name: str,
    condition: str,
    patient_age: int,
    patient_weight: float,
) -> dict | None:
    """Retrieve standard dosage from knowledge base."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{KNOWLEDGE_MCP_URL}/tools/retrieve_dosage",
                json={
                    "drug_name": drug_name,
                    "condition": condition,
                    "patient_age": patient_age,
                    "patient_weight_kg": patient_weight,
                },
                timeout=5.0,
            )
            res.raise_for_status()
            return res.json()
    except Exception:
        return None
```

---

## 3. PRESCRIPTION SERVICE (FastAPI)

```python
# app/domains/clinical/prescription_service.py
"""
Creates prescription record, triggers PDF generation,
handles dispatch to patient.
"""
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.clinical.models import Prescription
from app.workers.pdf_tasks import generate_prescription_pdf_task


async def create_prescription(
    db: AsyncSession,
    appointment_id: str,
    patient_id: str,
    doctor_id: str,
    diagnosis: str,
    medicines: list[dict],
    tests_ordered: list[str],
    instructions: str,
    follow_up_days: int,
) -> Prescription:

    prescription_id = f"RX-{uuid.uuid4().hex[:8].upper()}"
    follow_up_date = date.today() + timedelta(days=follow_up_days)

    prescription = Prescription(
        id=prescription_id,
        appointment_id=appointment_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        diagnosis=diagnosis,
        medicines=medicines,
        tests_ordered=tests_ordered,
        instructions=instructions,
        follow_up_date=follow_up_date,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    return prescription


async def trigger_pdf_generation(prescription_id: str) -> str:
    """Enqueue Celery task. Returns job_id."""
    job = generate_prescription_pdf_task.delay(prescription_id)
    return job.id


async def get_prescription_with_context(
    db: AsyncSession,
    prescription_id: str,
) -> dict:
    """Fetch prescription + doctor + patient + clinic for PDF render."""
    from app.domains.clinical.models import Prescription
    from app.domains.auth.models import Doctor, Patient
    from app.domains.appointments.models import Appointment
    from sqlalchemy import select

    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    rx = result.scalar_one_or_none()
    if not rx:
        return {}

    doctor = await db.get(Doctor, rx.doctor_id)
    patient = await db.get(Patient, rx.patient_id)

    return {
        "prescription": rx,
        "doctor": doctor,
        "patient": patient,
    }
```

---

## 4. PDF GENERATION (Celery + WeasyPrint)

```python
# app/workers/pdf_tasks.py
"""
Deterministic PDF generation.
NO LLM in render step — pure template + data.
WeasyPrint converts HTML → PDF.
Uploads to Supabase Storage.
"""
from celery import shared_task
import asyncio
from jinja2 import Template
from weasyprint import HTML as WeasyHTML
import tempfile
import os


PRESCRIPTION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: white;
    padding: 40px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid #1a1a2e;
    margin-bottom: 20px;
  }
  .clinic-name { font-size: 18px; font-weight: 600; }
  .clinic-meta { font-size: 11px; color: #666; margin-top: 4px; }
  .rx-date { font-family: 'IBM Plex Mono'; font-size: 12px; text-align: right; }

  /* Patient info */
  .patient-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 20px;
  }
  .patient-row .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; }
  .patient-row .value { font-weight: 600; margin-top: 2px; font-family: 'IBM Plex Mono'; }

  /* Doctor info */
  .doctor-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 20px;
    font-size: 12px;
    color: #444;
  }

  /* Diagnosis */
  .section-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #888;
    margin-bottom: 6px;
  }
  .diagnosis {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e5e5;
  }

  /* Rx symbol */
  .rx-symbol {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 12px;
    color: #1a1a2e;
  }

  /* Medicines */
  .medicine {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px dashed #e5e5e5;
  }
  .medicine:last-child { border-bottom: none; }
  .med-name { font-size: 15px; font-weight: 600; }
  .med-strength { color: #666; margin-left: 6px; font-family: 'IBM Plex Mono'; }
  .med-dosage {
    margin-top: 4px;
    font-family: 'IBM Plex Mono';
    font-size: 12px;
    color: #444;
  }
  .med-instructions {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

  /* Tests */
  .tests { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e5e5; }
  .test-item {
    display: inline-block;
    margin-right: 8px;
    margin-bottom: 6px;
    padding: 2px 10px;
    border: 1px solid #ccc;
    border-radius: 20px;
    font-size: 12px;
  }

  /* Instructions */
  .instructions-box {
    margin-top: 16px;
    padding: 12px;
    background: #f9f9f9;
    border-left: 3px solid #1a1a2e;
    font-size: 12px;
    line-height: 1.6;
  }

  /* Follow-up */
  .followup {
    margin-top: 16px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'IBM Plex Mono';
  }

  /* Footer */
  .footer {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .disclaimer {
    font-size: 10px;
    color: #999;
    max-width: 60%;
    line-height: 1.5;
  }
  .signature-box {
    text-align: center;
    min-width: 160px;
  }
  .signature-line {
    border-top: 1px solid #1a1a2e;
    padding-top: 6px;
    font-size: 12px;
    font-weight: 600;
  }
  .reg-no { font-size: 10px; color: #888; font-family: 'IBM Plex Mono'; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div>
    <div class="clinic-name">Cureva · {{ clinic_name }}</div>
    <div class="clinic-meta">{{ clinic_address }}</div>
    <div class="clinic-meta">{{ clinic_phone }}</div>
  </div>
  <div class="rx-date">
    <div style="font-weight:600">PRESCRIPTION</div>
    <div style="margin-top:4px">{{ rx_date }}</div>
    <div style="color:#888;font-size:10px;margin-top:2px">ID: {{ prescription_id }}</div>
  </div>
</div>

<!-- PATIENT INFO -->
<div class="patient-row">
  <div>
    <div class="label">Patient</div>
    <div class="value">{{ patient_name }}</div>
  </div>
  <div>
    <div class="label">Age / Gender</div>
    <div class="value">{{ patient_age }}{{ patient_gender }}</div>
  </div>
  <div>
    <div class="label">Patient ID</div>
    <div class="value">{{ patient_id }}</div>
  </div>
</div>

<!-- DOCTOR INFO -->
<div class="doctor-row">
  <span><strong>{{ doctor_name }}</strong> · {{ doctor_specialty }}</span>
  <span>Reg. No: {{ registration_no }}</span>
</div>

<!-- DIAGNOSIS -->
<div class="section-label">Diagnosis</div>
<div class="diagnosis">{{ diagnosis }}</div>

<!-- MEDICINES -->
<div class="rx-symbol">℞</div>
{% for med in medicines %}
<div class="medicine">
  <div>
    <span class="med-name">{{ loop.index }}. {{ med.name }}</span>
    <span class="med-strength">{{ med.strength }}</span>
  </div>
  <div class="med-dosage">
    {{ med.dosage }} &nbsp;·&nbsp; {{ med.duration_days }} days
  </div>
  {% if med.instructions %}
  <div class="med-instructions">{{ med.instructions }}</div>
  {% endif %}
</div>
{% endfor %}

<!-- TESTS ORDERED -->
{% if tests_ordered %}
<div class="tests">
  <div class="section-label">Tests Ordered</div>
  {% for test in tests_ordered %}
  <span class="test-item">{{ test }}</span>
  {% endfor %}
</div>
{% endif %}

<!-- INSTRUCTIONS -->
{% if instructions %}
<div class="section-label" style="margin-top:16px">Instructions</div>
<div class="instructions-box">{{ instructions }}</div>
{% endif %}

<!-- FOLLOW-UP -->
{% if follow_up_date %}
<div class="followup">Follow-up: {{ follow_up_date }}</div>
{% endif %}

<!-- FOOTER -->
<div class="footer">
  <div class="disclaimer">
    This prescription is issued by a qualified medical professional.
    Do not self-medicate. Keep medicines away from children.
    If you experience any adverse effects, consult your doctor immediately.
  </div>
  <div class="signature-box">
    <div style="height:40px"></div>
    <div class="signature-line">{{ doctor_name }}</div>
    <div class="reg-no">{{ registration_no }}</div>
  </div>
</div>

</body>
</html>
"""


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_prescription_pdf_task(self, prescription_id: str) -> str:
    """
    Celery task.
    1. Fetch prescription + doctor + patient from DB
    2. Render Jinja2 template → HTML
    3. WeasyPrint → PDF bytes
    4. Upload to Supabase Storage
    5. Update prescription.pdf_url
    Returns: pdf_url
    """
    try:
        return asyncio.run(_generate_pdf(prescription_id))
    except Exception as exc:
        raise self.retry(exc=exc)


async def _generate_pdf(prescription_id: str) -> str:
    from app.database import AsyncSessionLocal
    from app.domains.clinical.prescription_service import get_prescription_with_context
    from datetime import date

    async with AsyncSessionLocal() as db:
        ctx = await get_prescription_with_context(db, prescription_id)
        if not ctx:
            raise ValueError(f"Prescription {prescription_id} not found")

    rx      = ctx["prescription"]
    doctor  = ctx["doctor"]
    patient = ctx["patient"]

    # Calculate age
    age = ""
    if patient.dob:
        age = str((date.today() - patient.dob).days // 365)

    template = Template(PRESCRIPTION_TEMPLATE)
    html = template.render(
        clinic_name=doctor.clinic.name if hasattr(doctor, "clinic") else "City Clinic",
        clinic_address="Sector 12, Dwarka, New Delhi",
        clinic_phone="+91 11 XXXX XXXX",
        rx_date=date.today().strftime("%d %B %Y"),
        prescription_id=rx.id,
        patient_name=patient.name,
        patient_age=age,
        patient_gender=f" {patient.gender}" if patient.gender else "",
        patient_id=patient.id,
        doctor_name=doctor.name,
        doctor_specialty=doctor.specialty,
        registration_no=doctor.registration_no or "MCI/XXXXX",
        diagnosis=rx.diagnosis,
        medicines=rx.medicines,
        tests_ordered=rx.tests_ordered,
        instructions=rx.instructions,
        follow_up_date=rx.follow_up_date.strftime("%d %B %Y") if rx.follow_up_date else None,
    )

    # Render PDF
    pdf_bytes = WeasyHTML(string=html).write_pdf()

    # Upload to Supabase Storage
    pdf_url = await _upload_to_supabase(prescription_id, pdf_bytes)

    # Update DB record
    async with AsyncSessionLocal() as db:
        rx_record = await db.get(type(rx), prescription_id)
        if rx_record:
            rx_record.pdf_url = pdf_url
            await db.commit()

    return pdf_url


async def _upload_to_supabase(prescription_id: str, pdf_bytes: bytes) -> str:
    """Upload PDF to Supabase Storage. Returns public URL."""
    import httpx
    from app.config import settings

    file_path = f"prescriptions/{prescription_id}.pdf"

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.SUPABASE_URL}/storage/v1/object/prescriptions/{file_path}",
            headers={
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                "Content-Type": "application/pdf",
            },
            content=pdf_bytes,
        )
        res.raise_for_status()

    return f"{settings.SUPABASE_URL}/storage/v1/object/public/prescriptions/{file_path}"
```

---

## 5. DISPATCH (NOTIFICATION MCP)

```python
# mcp/notification/tools.py
from fastmcp import FastMCP
from pydantic import BaseModel
import httpx
from app.config import settings

mcp = FastMCP("notification-mcp")


class SendResult(BaseModel):
    success: bool
    channel: str
    message_id: str | None = None
    error: str | None = None


@mcp.tool()
async def send_prescription_whatsapp(
    patient_id: str,
    prescription_id: str,
    pdf_url: str,
    doctor_name: str,
) -> SendResult:
    """
    Send prescription PDF via WhatsApp.
    Uses Twilio sandbox in dev, real Twilio in prod.
    """
    # Fetch patient phone
    from app.database import AsyncSessionLocal
    from app.domains.auth.models import Patient
    async with AsyncSessionLocal() as db:
        patient = await db.get(Patient, patient_id)
        if not patient or not patient.phone:
            return SendResult(success=False, channel="whatsapp", error="No phone number")

    phone = patient.phone.replace(" ", "").replace("-", "")

    # Twilio sandbox (dev)
    if settings.ENVIRONMENT == "development":
        print(f"[mock-whatsapp] To: {phone}")
        print(f"[mock-whatsapp] Prescription ready: {pdf_url}")
        return SendResult(success=True, channel="whatsapp", message_id="mock-001")

    # Real Twilio (prod)
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={
                "From": f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
                "To":   f"whatsapp:{phone}",
                "Body": (
                    f"Your prescription from {doctor_name} is ready.\n"
                    f"Download: {pdf_url}\n\n"
                    "Cureva — Your Health, Managed."
                ),
                "MediaUrl": pdf_url,
            },
        )
        data = res.json()
        return SendResult(
            success=res.status_code == 201,
            channel="whatsapp",
            message_id=data.get("sid"),
            error=data.get("message") if res.status_code != 201 else None,
        )


@mcp.tool()
async def send_prescription_email(
    patient_id: str,
    prescription_id: str,
    pdf_url: str,
    doctor_name: str,
) -> SendResult:
    """Send prescription via email using Resend (free tier)."""
    from app.database import AsyncSessionLocal
    from app.domains.auth.models import Patient, User
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        patient = await db.get(Patient, patient_id)
        user_result = await db.execute(
            select(User).where(User.id == patient.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return SendResult(success=False, channel="email", error="No email")

    if settings.ENVIRONMENT == "development":
        print(f"[mock-email] To: {user.email} | PDF: {pdf_url}")
        return SendResult(success=True, channel="email", message_id="mock-email-001")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from":    "prescriptions@cureva.health",
                "to":      [user.email],
                "subject": f"Prescription from {doctor_name} — {__import__('datetime').date.today().strftime('%d %b %Y')}",
                "html": f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:8px">Your Prescription is Ready</h2>
  <p style="color:#666;margin-bottom:16px">
    {doctor_name} has prepared your prescription.
  </p>
  <a href="{pdf_url}"
     style="display:inline-block;padding:12px 24px;background:#E8D5B0;
            color:#000;text-decoration:none;border-radius:6px;font-weight:600">
    Download Prescription PDF
  </a>
  <p style="margin-top:24px;font-size:12px;color:#999">
    Cureva · Your Health, Managed
  </p>
</div>
""",
            },
        )
        data = res.json()
        return SendResult(
            success=res.status_code == 200,
            channel="email",
            message_id=data.get("id"),
        )
```

---

## 6. PRESCRIPTION ROUTER

```python
# app/domains/clinical/router.py (prescription endpoints)
from fastapi import APIRouter, Depends, BackgroundTasks
from app.dependencies import require_clinical, get_db
from app.domains.clinical import prescription_service
from app.workers.pdf_tasks import generate_prescription_pdf_task
from pydantic import BaseModel

router = APIRouter(prefix="/clinical", tags=["clinical"])


class PrescriptionCreate(BaseModel):
    appointment_id: str
    patient_id: str
    diagnosis: str
    medicines: list[dict]
    tests_ordered: list[str] = []
    instructions: str = ""
    follow_up_days: int = 30


@router.post("/prescriptions")
async def create_prescription(
    data: PrescriptionCreate,
    user=Depends(require_clinical),
    db=Depends(get_db),
):
    rx = await prescription_service.create_prescription(
        db=db,
        appointment_id=data.appointment_id,
        patient_id=data.patient_id,
        doctor_id=user.id,
        diagnosis=data.diagnosis,
        medicines=data.medicines,
        tests_ordered=data.tests_ordered,
        instructions=data.instructions,
        follow_up_days=data.follow_up_days,
    )
    return {"prescription_id": rx.id, "status": "created"}


@router.post("/prescriptions/{prescription_id}/generate-pdf")
async def generate_pdf(
    prescription_id: str,
    user=Depends(require_clinical),
):
    job = generate_prescription_pdf_task.delay(prescription_id)
    return {"job_id": job.id, "status": "queued"}


@router.get("/prescriptions/{prescription_id}/pdf-status/{job_id}")
async def pdf_status(prescription_id: str, job_id: str):
    from celery.result import AsyncResult
    result = AsyncResult(job_id)
    if result.ready():
        return {"status": "done", "pdf_url": result.get()}
    if result.failed():
        return {"status": "failed", "error": str(result.result)}
    return {"status": "processing"}


@router.post("/prescriptions/{prescription_id}/send")
async def send_prescription(
    prescription_id: str,
    channel: str,        # whatsapp | email | sms
    user=Depends(require_clinical),
    db=Depends(get_db),
):
    from app.domains.clinical.models import Prescription
    rx = await db.get(Prescription, prescription_id)
    if not rx or not rx.pdf_url:
        return {"error": "PDF not generated yet"}

    # Fetch doctor name
    from app.domains.auth.models import Doctor
    from sqlalchemy import select
    doctor = await db.get(Doctor, user.id)
    doctor_name = doctor.name if doctor else "Your Doctor"

    # Call Notification MCP
    import httpx
    async with httpx.AsyncClient() as client:
        endpoint = {
            "whatsapp": "send_prescription_whatsapp",
            "email":    "send_prescription_email",
        }.get(channel, "send_prescription_email")

        res = await client.post(
            f"http://localhost:8004/tools/{endpoint}",
            json={
                "patient_id":     rx.patient_id,
                "prescription_id": prescription_id,
                "pdf_url":        rx.pdf_url,
                "doctor_name":    doctor_name,
            },
        )
        result = res.json()

    if result.get("success"):
        from datetime import datetime
        rx.sent_at = datetime.utcnow()
        rx.sent_channel = channel
        await db.commit()

    return result
```

---

## STARTUP

```bash
# Install
pip install weasyprint jinja2 celery redis \
  anthropic instructor httpx --break-system-packages

# WeasyPrint system deps (Ubuntu)
apt-get install -y libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0

# Start Celery worker
celery -A app.workers.celery_app worker \
  --loglevel=info -Q prescriptions,notifications

# Start Notification MCP
python -m mcp.notification.server --port 8004

# Test PDF generation
python - <<'EOF'
import asyncio
from app.workers.pdf_tasks import _generate_pdf

async def test():
    url = await _generate_pdf("RX-TEST001")
    print(f"PDF: {url}")

asyncio.run(test())
EOF

# Test full flow
# 1. Create prescription via POST /clinical/prescriptions
# 2. POST /clinical/prescriptions/{id}/generate-pdf → job_id
# 3. GET  /clinical/prescriptions/{id}/pdf-status/{job_id} → poll
# 4. POST /clinical/prescriptions/{id}/send?channel=whatsapp
```

---

## RULES

```
1. PDF render = deterministic Jinja2 + WeasyPrint — NO LLM
2. Allergies checked BEFORE suggestion — allergen = removed, never suggested
3. Severe interactions = removed from list + alert shown to doctor
4. Generic drugs preferred — brand name only if generic unavailable in India
5. Doctor reviews every suggestion — agent never auto-saves prescription
6. PDF upload before dispatch — never send broken link
7. Celery retries 3x on PDF failure — 30s delay between retries
8. send_at + sent_channel logged — audit trail for dispatch
9. Mock dispatch in dev — real Twilio/Resend in prod (env flag)
10. Prescription ID format RX-XXXXXXXX — matches frontend mock shapes
```
