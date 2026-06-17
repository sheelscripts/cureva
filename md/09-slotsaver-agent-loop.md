# CUREVA — SlotSaver Agent Loop
### Prompt 09 of 20
### Role: Senior AI Engineer

---

## ROLE

Build complete SlotSaver Predict→Prevent→Recover→Learn loop.
XGBoost scorer. LangGraph state machine. Redis event queue.
Full runnable code. No stubs.

---

## THE LOOP

```
T-48h  scheduled_risk_run fires
         ↓
Predictor scores all tomorrow's appointments
High/critical → intervention scheduled
         ↓
T-4h   intervention fires per patient
         ↓
InterventionAgent sends SMS/WA/Voice
Monitors response 2h window
         ↓
Patient confirms → slot safe → done
Patient cancels  → recovery fires instantly
No response      → slot pre-warmed
         ↓
T+15m  no-show declared
         ↓
RecoveryAgent → waitlist rank → outreach → book
         ↓
Filled → revenue recovered
Timeout → EscalationAgent → frontdesk handoff
         ↓
AuditAgent scores session
         ↓
LearnLoop retrains scorer weekly
```

---

## STACK

```
XGBoost + SHAP    → risk scorer
LangGraph         → agent state machine
FastMCP           → tool layer
Redis Streams     → event queue
APScheduler       → T-48h + T-4h cron jobs
Langfuse          → tracing
SQLAlchemy async  → DB writes via service layer
```

---

## 1. RISK SCORER

```python
# ml/train.py
import pandas as pd
import numpy as np
import xgboost as xgb
import shap
import pickle
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

FEATURES = [
    "is_new_patient",       # bool
    "lead_time_days",       # int: days between booking and appointment
    "distance_km",          # float
    "day_of_week",          # 0=Mon 6=Sun
    "hour_of_day",          # 9-18
    "specialty_encoded",    # 0-4
    "past_no_show_rate",    # float 0-1
    "no_show_streak",       # int: consecutive misses
    "last_reminder_response",  # 0=no response 1=responded
    "appointment_value_inr",   # int
    "is_follow_up",         # bool
]

SPECIALTY_MAP = {
    "Cardiology": 0, "General Medicine": 1,
    "Dermatology": 2, "Orthopaedics": 3, "Psychiatry": 4,
}

def generate_synthetic_data(n=5000) -> pd.DataFrame:
    """
    Generate realistic Indian clinic no-show patterns.
    Based on: Monday AM spike, Friday PM dip,
    new patients 2x higher, distance >15km higher.
    """
    np.random.seed(42)
    data = []

    for _ in range(n):
        is_new = np.random.choice([0, 1], p=[0.75, 0.25])
        lead   = np.random.randint(1, 30)
        dist   = np.random.exponential(scale=8)
        dow    = np.random.randint(0, 6)
        hour   = np.random.choice(range(9, 18))
        spec   = np.random.randint(0, 5)
        streak = np.random.choice([0,0,0,1,2], p=[0.6,0.2,0.1,0.07,0.03])
        past_rate = np.random.beta(2, 8)     # most patients show up
        last_resp = np.random.choice([0, 1], p=[0.35, 0.65])
        value  = np.random.choice([800, 1200, 1500, 1800])
        is_followup = np.random.choice([0, 1], p=[0.6, 0.4])

        # Ground truth no-show probability
        p = (
            0.08                           # base rate
            + is_new       * 0.15
            + (lead > 14)  * 0.10
            + (dist > 15)  * 0.08
            + (dow == 0)   * 0.06          # Monday
            + (dow == 4)   * 0.05          # Friday
            + (hour < 10)  * 0.04          # early morning
            + (spec == 2)  * 0.06          # Dermatology
            + (spec == 4)  * 0.08          # Psychiatry
            + streak       * 0.10
            + past_rate    * 0.20
            + (last_resp == 0) * 0.07
            - is_followup  * 0.03
        )
        p = np.clip(p, 0.02, 0.95)
        no_show = int(np.random.random() < p)

        data.append([
            is_new, lead, dist, dow, hour, spec,
            past_rate, streak, last_resp, value, is_followup, no_show
        ])

    cols = FEATURES + ["no_show"]
    return pd.DataFrame(data, columns=cols)


def train():
    df = generate_synthetic_data(5000)
    X = df[FEATURES]
    y = df["no_show"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=4,     # class imbalance: ~20% no-show
        use_label_encoder=False,
        eval_metric="auc",
        random_state=42,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        early_stopping_rounds=20,
        verbose=False,
    )

    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
    print(f"AUC: {auc:.4f}")

    # SHAP explainer
    explainer = shap.TreeExplainer(model)

    with open("ml/models/risk_scorer_v1.pkl", "wb") as f:
        pickle.dump({"model": model, "explainer": explainer, "features": FEATURES}, f)

    print("Model saved → ml/models/risk_scorer_v1.pkl")


if __name__ == "__main__":
    train()
```

```python
# ml/predict.py
import pickle
import numpy as np
import shap
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Risk Scorer", version="1.0")

with open("ml/models/risk_scorer_v1.pkl", "rb") as f:
    bundle = pickle.load(f)
    MODEL     = bundle["model"]
    EXPLAINER = bundle["explainer"]
    FEATURES  = bundle["features"]

SPECIALTY_MAP = {
    "Cardiology": 0, "General Medicine": 1,
    "Dermatology": 2, "Orthopaedics": 3, "Psychiatry": 4,
}

TIER_THRESHOLDS = [
    (0.85, "critical"),
    (0.65, "high"),
    (0.40, "medium"),
    (0.00, "low"),
]

CHANNEL_MAP = {
    "critical": "voice_call",
    "high":     "voice_call",
    "medium":   "whatsapp",
    "low":      "sms",
}


class PredictRequest(BaseModel):
    appointment_id: str
    is_new_patient: bool
    lead_time_days: int
    distance_km: float
    day_of_week: int
    hour_of_day: int
    specialty: str
    past_no_show_rate: float
    no_show_streak: int
    last_reminder_response: int
    appointment_value_inr: int
    is_follow_up: bool


class PredictResponse(BaseModel):
    appointment_id: str
    score: float
    tier: str
    recommended_channel: str
    top_factors: list[str]
    shap_values: dict


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    spec_enc = SPECIALTY_MAP.get(req.specialty, 1)
    X = np.array([[
        int(req.is_new_patient),
        req.lead_time_days,
        req.distance_km,
        req.day_of_week,
        req.hour_of_day,
        spec_enc,
        req.past_no_show_rate,
        req.no_show_streak,
        req.last_reminder_response,
        req.appointment_value_inr,
        int(req.is_follow_up),
    ]])

    score = float(MODEL.predict_proba(X)[0][1])
    tier  = next(t for threshold, t in TIER_THRESHOLDS if score >= threshold)
    channel = CHANNEL_MAP[tier]

    # SHAP explanations
    shap_vals = EXPLAINER.shap_values(X)[0]
    shap_dict = dict(zip(FEATURES, [float(v) for v in shap_vals]))

    # Top 3 factors (highest absolute SHAP)
    sorted_factors = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    top_factors = _humanize_factors(sorted_factors[:3], req)

    return PredictResponse(
        appointment_id=req.appointment_id,
        score=round(score, 4),
        tier=tier,
        recommended_channel=channel,
        top_factors=top_factors,
        shap_values=shap_dict,
    )


def _humanize_factors(factors: list, req: PredictRequest) -> list[str]:
    """Convert SHAP feature names → plain English for doctor view."""
    labels = {
        "is_new_patient":        "New patient (first visit)",
        "lead_time_days":        f"Booked {req.lead_time_days} days ago",
        "distance_km":           f"Distance: {req.distance_km:.1f}km from clinic",
        "day_of_week":           f"{'Monday' if req.day_of_week == 0 else 'Friday'} appointment",
        "specialty_encoded":     f"{req.specialty} (higher no-show rate)",
        "past_no_show_rate":     f"Past no-show rate: {req.past_no_show_rate:.0%}",
        "no_show_streak":        f"{req.no_show_streak} consecutive missed appointments",
        "last_reminder_response": "No response to last reminder",
        "is_follow_up":          "Follow-up appointment",
    }
    return [labels.get(f, f) for f, _ in factors if abs(_ ) > 0.01]
```

---

## 2. SCHEDULED JOBS

```python
# agents/scheduler.py
"""
APScheduler jobs:
  T-48h: score all appointments for day after tomorrow
  T-4h:  fire interventions for high/critical risk
  T+15m: declare no-shows (appointment time passed, no check-in)
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import json
from app.utils.redis import get_redis
from app.database import AsyncSessionLocal
from sqlalchemy import select, and_
from app.domains.appointments.models import Appointment, AppointmentStatus


scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


@scheduler.scheduled_job(CronTrigger(hour=8, minute=0))   # 8 AM daily
async def run_daily_risk_scoring():
    """Score all appointments for tomorrow."""
    target_date = (datetime.now() + timedelta(days=1)).date()
    print(f"[scheduler] Risk scoring for {target_date}")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.slot_time >= datetime.combine(target_date, datetime.min.time()),
                    Appointment.slot_time <  datetime.combine(target_date + timedelta(days=1), datetime.min.time()),
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
        )
        appointments = result.scalars().all()

    redis = await get_redis()
    for appt in appointments:
        await redis.xadd("scheduled_risk_runs", {
            "data": json.dumps({
                "appointment_id": appt.id,
                "patient_id": appt.patient_id,
                "doctor_id": appt.doctor_id,
                "slot_time": appt.slot_time.isoformat(),
                "specialty": appt.specialty,
                "value_inr": appt.value_inr,
            })
        })

    print(f"[scheduler] Queued {len(appointments)} risk score jobs")


@scheduler.scheduled_job(CronTrigger(minute="*/30"))      # every 30 min
async def fire_due_interventions():
    """
    Find appointments where:
      - risk_tier in (high, critical)
      - intervention_time is within next 30 minutes
      - intervention not yet sent
    Fire intervention events to Redis.
    """
    now = datetime.now()
    window_end = now + timedelta(minutes=30)

    async with AsyncSessionLocal() as db:
        from app.domains.slotsaver.models import RiskScore, InterventionLog
        from sqlalchemy import select

        # Get high/critical risk scores due for intervention
        result = await db.execute(
            select(RiskScore).where(
                and_(
                    RiskScore.tier.in_(["high", "critical"]),
                    RiskScore.intervention_time >= now,
                    RiskScore.intervention_time <= window_end,
                )
            )
        )
        due_scores = result.scalars().all()

        # Filter: not already intervened
        for score in due_scores:
            existing = await db.execute(
                select(InterventionLog).where(
                    InterventionLog.appointment_id == score.appointment_id
                )
            )
            if existing.scalar_one_or_none():
                continue    # already sent

            redis = await get_redis()
            await redis.xadd("intervention_events", {
                "data": json.dumps({
                    "appointment_id": score.appointment_id,
                    "patient_id": score.patient_id,
                    "risk_score": float(score.score),
                    "risk_tier": score.tier,
                    "planned_intervention": score.planned_intervention,
                })
            })

    print(f"[scheduler] Fired {len(due_scores)} intervention events")


@scheduler.scheduled_job(CronTrigger(minute="*/15"))      # every 15 min
async def declare_no_shows():
    """
    Appointments where slot_time + 15min has passed,
    status still 'confirmed' or 'scheduled' → declare no_show.
    Publish to cancellation_events to trigger recovery.
    """
    threshold = datetime.now() - timedelta(minutes=15)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.slot_time <= threshold,
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
        )
        no_shows = result.scalars().all()

        redis = await get_redis()
        for appt in no_shows:
            # Update status
            appt.status = AppointmentStatus.no_show
            db.add(appt)

            # Trigger recovery
            await redis.xadd("cancellation_events", {
                "data": json.dumps({
                    "appointment_id": appt.id,
                    "slot_id": appt.slot_id,
                    "doctor_id": appt.doctor_id,
                    "specialty": appt.specialty,
                    "slot_time": appt.slot_time.isoformat(),
                    "value_inr": appt.value_inr,
                    "trigger": "no_show",
                })
            })

        await db.commit()
        if no_shows:
            print(f"[scheduler] Declared {len(no_shows)} no-shows → recovery triggered")


def start_scheduler():
    scheduler.start()
    print("[scheduler] APScheduler started")
```

---

## 3. LEARN LOOP

```python
# ml/learn_loop.py
"""
Weekly retrain of risk scorer on real outcomes.
Compares new model vs current on holdout set.
Promotes if AUC improves. Notifies admin if degrades.
"""
import pickle
import asyncio
from datetime import datetime, timedelta
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
import xgboost as xgb
import pandas as pd
import numpy as np
from app.database import AsyncSessionLocal
from sqlalchemy import select, and_
from app.domains.slotsaver.models import RiskScore
from app.domains.appointments.models import Appointment


async def collect_training_data(days: int = 30) -> pd.DataFrame:
    """Collect last N days of appointments + actual outcomes."""
    since = datetime.now() - timedelta(days=days)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Appointment, RiskScore)
            .join(RiskScore, RiskScore.appointment_id == Appointment.id)
            .where(Appointment.slot_time >= since)
        )
        rows = result.all()

    records = []
    for appt, score in rows:
        if not score.features:
            continue
        features = score.features
        no_show = 1 if appt.status == "no_show" else 0
        records.append({**features, "no_show": no_show})

    return pd.DataFrame(records)


async def retrain_and_evaluate():
    """
    1. Collect real data
    2. Retrain XGBoost
    3. Compare AUC vs current model
    4. Promote if better, alert if worse
    """
    from ml.train import FEATURES

    print("[learn] Collecting training data...")
    df = await collect_training_data(days=30)

    if len(df) < 200:
        print(f"[learn] Not enough data ({len(df)} rows). Skipping retrain.")
        return

    X = df[FEATURES].fillna(0)
    y = df["no_show"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Train new model
    new_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, scale_pos_weight=4,
        use_label_encoder=False, eval_metric="auc",
    )
    new_model.fit(X_train, y_train, verbose=False)
    new_auc = roc_auc_score(y_test, new_model.predict_proba(X_test)[:, 1])

    # Load current model AUC
    with open("ml/models/risk_scorer_v1.pkl", "rb") as f:
        current = pickle.load(f)
    current_model = current["model"]
    current_auc = roc_auc_score(y_test, current_model.predict_proba(X_test)[:, 1])

    print(f"[learn] Current AUC: {current_auc:.4f} | New AUC: {new_auc:.4f}")

    if new_auc > current_auc + 0.005:
        # Promote new model
        import shap
        explainer = shap.TreeExplainer(new_model)
        with open("ml/models/risk_scorer_v1.pkl", "wb") as f:
            pickle.dump({"model": new_model, "explainer": explainer, "features": FEATURES}, f)
        print(f"[learn] ✅ New model promoted. AUC improved {current_auc:.4f} → {new_auc:.4f}")
        await _notify_admin("model_promoted", new_auc, current_auc)

    elif new_auc < current_auc - 0.01:
        # Degradation — alert, keep current
        print(f"[learn] ⚠️  Model degraded. Keeping current.")
        await _notify_admin("model_degraded", new_auc, current_auc)

    else:
        print(f"[learn] No significant change. Keeping current model.")


async def _notify_admin(event: str, new_auc: float, old_auc: float):
    from app.utils.redis import get_redis
    import json
    redis = await get_redis()
    await redis.xadd("admin_notifications", {"data": json.dumps({
        "event": event,
        "new_auc": new_auc,
        "old_auc": old_auc,
        "timestamp": datetime.utcnow().isoformat(),
    })})


# Add to APScheduler
# @scheduler.scheduled_job(CronTrigger(day_of_week="sun", hour=2))
# async def weekly_retrain():
#     await retrain_and_evaluate()
```

---

## 4. FULL SLOTSAVER MCP TOOLS

```python
# mcp/waitlist/tools.py
from fastmcp import FastMCP
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.domains.appointments.models import Waitlist, Patient
import httpx

mcp = FastMCP("waitlist-mcp")


class RankedPatient(BaseModel):
    patient_id: str
    patient_name: str
    rank: int
    score: float
    wait_days: int
    distance_km: float
    channel: str


@mcp.tool()
async def score_waitlist(
    slot_id: str,
    specialty: str,
    doctor_id: str | None = None,
) -> list[RankedPatient]:
    """
    Rank waitlisted patients for a given cancelled slot.
    Score = wait_days*0.30 + urgency*0.25 + proximity*0.20
            + acceptance_prob*0.15 + specialty_match*0.10
    """
    async with AsyncSessionLocal() as db:
        q = select(Waitlist, Patient).join(
            Patient, Patient.id == Waitlist.patient_id
        ).where(
            Waitlist.specialty == specialty,
            Waitlist.is_active == True,
        )
        if doctor_id:
            q = q.where(
                (Waitlist.doctor_id == doctor_id) | (Waitlist.doctor_id == None)
            )
        result = await db.execute(q)
        rows = result.all()

    ranked = []
    for wl, patient in rows:
        wait_score     = min(wl.wait_days / 30, 1.0)
        urgency_score  = {"low": 0.3, "medium": 0.6, "high": 1.0}.get(wl.urgency, 0.3)
        prox_score     = max(0, 1 - patient.distance_km / 25)
        accept_prob    = 0.7     # default — will improve with real data
        specialty_match = 1.0 if wl.specialty == specialty else 0.5

        score = (
            wait_score     * 0.30 +
            urgency_score  * 0.25 +
            prox_score     * 0.20 +
            accept_prob    * 0.15 +
            specialty_match * 0.10
        )

        # Channel from patient preferences
        prefs = patient.preferences or {}
        channel_pref = prefs.get("preferred_channel", "whatsapp")

        ranked.append(RankedPatient(
            patient_id=patient.id,
            patient_name=patient.name,
            rank=0,
            score=round(score, 3),
            wait_days=wl.wait_days,
            distance_km=float(patient.distance_km),
            channel=channel_pref,
        ))

    # Sort + assign rank
    ranked.sort(key=lambda x: x.score, reverse=True)
    for i, p in enumerate(ranked):
        p.rank = i + 1

    return ranked[:10]   # top 10 max


@mcp.tool()
async def book_slot(
    patient_id: str,
    slot_id: str,
    session_id: str,
) -> dict:
    """Book slot for patient. Updates slot + appointment + waitlist."""
    async with AsyncSessionLocal() as db:
        from app.domains.appointments.models import Slot, SlotStatus, Appointment, AppointmentStatus
        import uuid

        slot = await db.get(Slot, slot_id)
        if not slot or slot.status != "available":
            return {"success": False, "reason": "slot_unavailable"}

        # Create appointment
        appt_id = f"A-{uuid.uuid4().hex[:8].upper()}"
        appt = Appointment(
            id=appt_id,
            patient_id=patient_id,
            doctor_id=slot.doctor_id,
            slot_id=slot_id,
            slot_time=slot.start_time,
            status=AppointmentStatus.confirmed,
        )
        db.add(appt)

        # Mark slot booked
        slot.status = SlotStatus.booked
        slot.appointment_id = appt_id

        # Remove from waitlist
        from app.domains.appointments.models import Waitlist
        wl_result = await db.execute(
            select(Waitlist).where(Waitlist.patient_id == patient_id)
        )
        for wl_entry in wl_result.scalars().all():
            wl_entry.is_active = False

        await db.commit()

        return {
            "success": True,
            "appointment_id": appt_id,
            "slot_time": slot.start_time.isoformat(),
            "session_id": session_id,
        }
```

---

## 5. REAL-TIME WEBSOCKET (frontend feed)

```python
# app/domains/slotsaver/ws.py
"""
WebSocket endpoint: front desk receives live recovery session updates.
Agent runner publishes to Redis channel.
WS handler subscribes + streams to browser.
"""
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json
from app.utils.redis import get_redis


async def recovery_feed_ws(websocket: WebSocket):
    await websocket.accept()
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe("recovery:updates")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
    except WebSocketDisconnect:
        await pubsub.unsubscribe("recovery:updates")


# In runner.py — after each agent step, publish update:
async def publish_session_update(session_id: str, state: dict):
    redis = await get_redis()
    await redis.publish("recovery:updates", json.dumps({
        "session_id": session_id,
        "status": state.get("recovery_outcome", "active"),
        "patients_contacted": len(state.get("outreach_attempts") or []),
        "fill_time_seconds": state.get("fill_time_seconds"),
        "revenue_inr": state.get("value_inr") if state.get("recovery_outcome") == "recovered" else 0,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }))
```

---

## STARTUP

```bash
# Train risk scorer first
python ml/train.py

# Start ML inference server (separate port)
uvicorn ml.predict:app --port 8002 --reload

# Start FastAPI (includes WebSocket)
uvicorn app.main:app --port 8000 --reload

# Start agent runner
python -m agents.runner

# Start scheduler (add to lifespan in main.py)
# agents/scheduler.py → start_scheduler() called in app lifespan

# Test full loop end-to-end
python - <<'EOF'
import asyncio, json
from app.utils.redis import get_redis
from datetime import datetime, timedelta

async def test():
    redis = await get_redis()

    # Simulate cancellation
    await redis.xadd("cancellation_events", {"data": json.dumps({
        "appointment_id": "A-8821",
        "slot_id":        "SLOT-001",
        "doctor_id":      "D-001",
        "doctor_name":    "Dr. Sharma",
        "specialty":      "Cardiology",
        "slot_time":      (datetime.now() + timedelta(hours=1)).isoformat(),
        "value_inr":      1500,
        "trigger":        "cancellation",
    })})
    print("Cancellation published → watch agent runner logs")

asyncio.run(test())
EOF
```

---

## RULES

```
1. Scorer runs on ALL appointments — agent only fires for high/critical
2. XGBoost train → ml/models/risk_scorer_v1.pkl (versioned)
3. Learn loop compares AUC on holdout — never blindly promotes
4. WebSocket publishes on every agent step — frontend always live
5. Scheduler uses Asia/Kolkata timezone — Indian clinic hours
6. no_show declared T+15min — not T+0 (doctor may be running late)
7. book_slot checks slot.status == available before booking — race condition
8. waitlist.is_active = False after booking — no double-booking
9. Redis XACK only after full session completes
10. Weekly retrain needs min 200 real rows — skips if not enough data
```
