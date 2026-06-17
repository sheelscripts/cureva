# CUREVA — MCP Servers
### Prompt 12 of 20
### Role: Senior AI Systems Engineer

---

## ROLE

Build all 7 Cureva FastMCP servers.
Every agent tool call goes through here.
No agent touches DB directly — ever.
Full runnable code. Pydantic v2. Versioned tools.

---

## ARCHITECTURE

```
Agent
  ↓
MCP Tool Call (HTTP)
  ↓
FastMCP Server
  ↓
Service Layer
  ↓
Database
```

```
Port map:
  8001 → Patient MCP
  8002 → Appointment MCP
  8003 → Waitlist MCP
  8004 → Doctor MCP
  8005 → Clinical MCP
  8006 → Knowledge MCP (RAG)
  8007 → Analytics MCP
```

---

## SHARED BASE

```python
# mcp/base.py
from fastmcp import FastMCP
from functools import wraps
import time
import uuid
from datetime import datetime
from app.utils.redis import get_redis
import json

def mcp_tool_logger(server_name: str):
    """
    Decorator: logs every tool call to Redis stream.
    Agent runner drains → mcp_tool_calls table.
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            call_id = str(uuid.uuid4())
            started = time.time()
            success = True
            error = ""
            result = None

            try:
                result = await fn(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error = str(e)
                raise
            finally:
                latency = int((time.time() - started) * 1000)
                try:
                    redis = await get_redis()
                    await redis.xadd("mcp_tool_calls_stream", {"data": json.dumps({
                        "id": call_id,
                        "tool_name": f"{server_name}.{fn.__name__}",
                        "mcp_server": server_name,
                        "latency_ms": latency,
                        "success": success,
                        "error": error,
                        "timestamp": datetime.utcnow().isoformat(),
                    })})
                except Exception:
                    pass   # never let logging break tool execution
        return wrapper
    return decorator
```

---

## 1. PATIENT MCP

```python
# mcp/patient/server.py
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from app.database import AsyncSessionLocal
from sqlalchemy import select, or_
from app.domains.auth.models import Patient, User
from app.domains.clinical.models import MedicalHistory, Allergy, Prescription
from mcp.base import mcp_tool_logger

mcp = FastMCP("patient-mcp", version="1.0")


class PatientProfile(BaseModel):
    id: str
    name: str
    phone: str
    dob: Optional[str]
    gender: Optional[str]
    blood_group: Optional[str]
    address: Optional[str]
    city: Optional[str]
    distance_km: float
    preferences: dict
    allergies: list[str]
    active_conditions: list[str]


class AttendanceRecord(BaseModel):
    appointment_id: str
    slot_time: str
    specialty: str
    status: str    # completed | no_show | cancelled
    doctor_name: str


class MedicalContext(BaseModel):
    age: Optional[int]
    gender: Optional[str]
    weight_kg: Optional[float]
    blood_group: Optional[str]
    allergies: list[str]
    current_medications: list[dict]
    medical_history: list[dict]
    relevant_history: list[str]


class ContactPrefs(BaseModel):
    preferred_channel: str
    preferred_language: str
    preferred_window: str
    phone: str
    email: Optional[str]


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def lookup_patient(patient_id: str) -> PatientProfile:
    """Fetch complete patient profile by ID."""
    async with AsyncSessionLocal() as db:
        patient = await db.get(Patient, patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        allergies_result = await db.execute(
            select(Allergy).where(Allergy.patient_id == patient_id)
        )
        allergies = [a.allergen for a in allergies_result.scalars().all()]

        history_result = await db.execute(
            select(MedicalHistory).where(
                MedicalHistory.patient_id == patient_id,
                MedicalHistory.status == "active",
            )
        )
        conditions = [h.condition for h in history_result.scalars().all()]

        prefs = patient.preferences or {}
        return PatientProfile(
            id=patient.id,
            name=patient.name,
            phone=patient.phone or "",
            dob=patient.dob.isoformat() if patient.dob else None,
            gender=patient.gender,
            blood_group=patient.blood_group,
            address=patient.address,
            city=patient.city,
            distance_km=float(patient.distance_km or 0),
            preferences=prefs,
            allergies=allergies,
            active_conditions=conditions,
        )


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def get_attendance_history(
    patient_id: str,
    limit: int = 10,
) -> list[AttendanceRecord]:
    """Fetch patient's appointment attendance history."""
    from app.domains.appointments.models import Appointment
    from app.domains.auth.models import Doctor

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Appointment, Doctor)
            .join(Doctor, Doctor.id == Appointment.doctor_id)
            .where(Appointment.patient_id == patient_id)
            .order_by(Appointment.slot_time.desc())
            .limit(limit)
        )
        rows = result.all()

    return [
        AttendanceRecord(
            appointment_id=appt.id,
            slot_time=appt.slot_time.isoformat(),
            specialty=appt.specialty or "",
            status=appt.status.value,
            doctor_name=doc.name,
        )
        for appt, doc in rows
    ]


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def get_medical_context(patient_id: str) -> MedicalContext:
    """
    Full medical context for Prescription Agent.
    Includes allergies, current meds, active conditions.
    """
    from app.domains.clinical.models import MedicalHistory, Allergy, Prescription
    from datetime import date

    async with AsyncSessionLocal() as db:
        patient = await db.get(Patient, patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        allergies = await db.execute(
            select(Allergy).where(Allergy.patient_id == patient_id)
        )
        allergy_list = [a.allergen for a in allergies.scalars().all()]

        history = await db.execute(
            select(MedicalHistory).where(MedicalHistory.patient_id == patient_id)
        )
        history_list = [
            {"condition": h.condition, "status": h.status, "since": str(h.diagnosed_at)}
            for h in history.scalars().all()
        ]
        active = [h["condition"] for h in history_list if h["status"] == "active"]

        # Latest prescription = current medications
        latest_rx = await db.execute(
            select(Prescription)
            .where(Prescription.patient_id == patient_id)
            .order_by(Prescription.created_at.desc())
            .limit(1)
        )
        rx = latest_rx.scalar_one_or_none()
        current_meds = rx.medicines if rx else []

        age = None
        if patient.dob:
            age = (date.today() - patient.dob).days // 365

        return MedicalContext(
            age=age,
            gender=patient.gender,
            weight_kg=None,    # from vitals — future
            blood_group=patient.blood_group,
            allergies=allergy_list,
            current_medications=current_meds,
            medical_history=history_list,
            relevant_history=active,
        )


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def get_contact_preferences(patient_id: str) -> ContactPrefs:
    """Fetch patient's communication preferences."""
    from app.domains.auth.models import User

    async with AsyncSessionLocal() as db:
        patient = await db.get(Patient, patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        user = await db.get(User, patient.user_id)
        prefs = patient.preferences or {}

        return ContactPrefs(
            preferred_channel=prefs.get("preferred_channel", "whatsapp"),
            preferred_language=prefs.get("preferred_language", "english"),
            preferred_window=prefs.get("preferred_window", "morning"),
            phone=patient.phone or "",
            email=user.email if user else None,
        )


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def search_patients(
    query: str,
    limit: int = 10,
) -> list[PatientProfile]:
    """Search patients by name or phone. Doctor/admin only."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Patient).where(
                or_(
                    Patient.name.ilike(f"%{query}%"),
                    Patient.phone.ilike(f"%{query}%"),
                    Patient.id.ilike(f"%{query}%"),
                )
            ).limit(limit)
        )
        patients = result.scalars().all()

    out = []
    for p in patients:
        out.append(PatientProfile(
            id=p.id, name=p.name, phone=p.phone or "",
            dob=p.dob.isoformat() if p.dob else None,
            gender=p.gender, blood_group=p.blood_group,
            address=p.address, city=p.city,
            distance_km=float(p.distance_km or 0),
            preferences=p.preferences or {},
            allergies=[], active_conditions=[],
        ))
    return out


@mcp.tool()
@mcp_tool_logger("patient-mcp")
async def get_appointment_features(appointment_id: str) -> dict:
    """
    Build feature vector for risk scorer.
    Used by Predictor Agent.
    """
    from app.domains.appointments.models import Appointment
    from datetime import datetime, date

    async with AsyncSessionLocal() as db:
        appt = await db.get(Appointment, appointment_id)
        if not appt:
            raise ValueError(f"Appointment {appointment_id} not found")

        patient = await db.get(Patient, appt.patient_id)
        history = await db.execute(
            select(MedicalHistory).where(
                MedicalHistory.patient_id == appt.patient_id
            )
        )

        # Past attendance
        past = await db.execute(
            select(Appointment).where(
                Appointment.patient_id == appt.patient_id,
                Appointment.id != appointment_id,
            ).order_by(Appointment.slot_time.desc()).limit(20)
        )
        past_appts = past.scalars().all()
        total = len(past_appts)
        no_shows = sum(1 for a in past_appts if a.status.value == "no_show")
        streak = 0
        for a in past_appts:
            if a.status.value == "no_show":
                streak += 1
            else:
                break

    specialty_map = {
        "Cardiology": 0, "General Medicine": 1,
        "Dermatology": 2, "Orthopaedics": 3, "Psychiatry": 4,
    }

    return {
        "appointment_id": appointment_id,
        "is_new_patient": int(appt.is_new_patient or total == 0),
        "lead_time_days": appt.lead_time_days or 0,
        "distance_km": float(patient.distance_km or 0) if patient else 0,
        "day_of_week": appt.slot_time.weekday(),
        "hour_of_day": appt.slot_time.hour,
        "specialty_encoded": specialty_map.get(appt.specialty or "", 1),
        "past_no_show_rate": no_shows / total if total > 0 else 0.0,
        "no_show_streak": streak,
        "last_reminder_response": 0,    # populated from intervention_log later
        "appointment_value_inr": appt.value_inr or 0,
        "is_follow_up": int(appt.is_follow_up or False),
    }


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8001)
```

---

## 2. APPOINTMENT MCP

```python
# mcp/appointment/server.py
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal
from sqlalchemy import select, and_
from mcp.base import mcp_tool_logger

mcp = FastMCP("appointment-mcp", version="1.0")


class SlotResponse(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str
    specialty: str
    start_time: str
    end_time: str
    status: str
    value_inr: int


class BookingConfirmation(BaseModel):
    success: bool
    appointment_id: Optional[str]
    slot_time: Optional[str]
    doctor_name: Optional[str]
    reason: Optional[str]


class QueueEntry(BaseModel):
    appointment_id: str
    patient_id: str
    patient_name: str
    time: str
    reason: str
    status: str
    is_new_patient: bool
    wait_minutes: Optional[int]


@mcp.tool()
@mcp_tool_logger("appointment-mcp")
async def get_available_slots(
    specialty: str,
    doctor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[SlotResponse]:
    """Get available slots filtered by specialty/doctor/date."""
    from app.domains.appointments.models import Slot
    from app.domains.auth.models import Doctor

    date_start = datetime.fromisoformat(date_from) if date_from else datetime.now()
    date_end   = datetime.fromisoformat(date_to) if date_to \
                 else date_start + timedelta(days=7)

    async with AsyncSessionLocal() as db:
        q = (
            select(Slot, Doctor)
            .join(Doctor, Doctor.id == Slot.doctor_id)
            .where(
                Slot.status == "available",
                Slot.start_time >= date_start,
                Slot.start_time <= date_end,
                Doctor.specialty == specialty,
            )
        )
        if doctor_id:
            q = q.where(Slot.doctor_id == doctor_id)

        result = await db.execute(q.order_by(Slot.start_time).limit(20))
        rows = result.all()

    return [
        SlotResponse(
            id=slot.id,
            doctor_id=doc.id,
            doctor_name=doc.name,
            specialty=doc.specialty,
            start_time=slot.start_time.isoformat(),
            end_time=slot.end_time.isoformat(),
            status=slot.status.value,
            value_inr=doc.consultation_fee_inr or 0,
        )
        for slot, doc in rows
    ]


@mcp.tool()
@mcp_tool_logger("appointment-mcp")
async def book_appointment(
    patient_id: str,
    slot_id: str,
    reason: str = "",
) -> BookingConfirmation:
    """
    Book slot for patient.
    Checks availability atomically.
    """
    import uuid
    from app.domains.appointments.models import Slot, Appointment
    from app.domains.auth.models import Doctor, Patient
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # Lock slot row
        slot = await db.get(Slot, slot_id)
        if not slot:
            return BookingConfirmation(success=False, reason="slot_not_found")
        if slot.status != "available":
            return BookingConfirmation(success=False, reason="slot_unavailable")

        doctor = await db.get(Doctor, slot.doctor_id)
        patient = await db.get(Patient, patient_id)
        if not patient:
            return BookingConfirmation(success=False, reason="patient_not_found")

        # Check patient no existing booking for this slot time
        existing = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.patient_id == patient_id,
                    Appointment.slot_time == slot.start_time,
                    Appointment.status.notin_(["cancelled", "no_show"]),
                )
            )
        )
        if existing.scalar_one_or_none():
            return BookingConfirmation(success=False, reason="patient_already_booked")

        appt_id = f"A-{uuid.uuid4().hex[:8].upper()}"
        lead_time = max(0, (slot.start_time.date() - __import__("datetime").date.today()).days)

        appt = Appointment(
            id=appt_id,
            patient_id=patient_id,
            doctor_id=slot.doctor_id,
            slot_id=slot_id,
            slot_time=slot.start_time,
            status="confirmed",
            specialty=doctor.specialty if doctor else "",
            value_inr=doctor.consultation_fee_inr if doctor else 0,
            reason=reason,
            lead_time_days=lead_time,
        )
        db.add(appt)
        slot.status = "booked"
        slot.appointment_id = appt_id
        await db.commit()

    return BookingConfirmation(
        success=True,
        appointment_id=appt_id,
        slot_time=slot.start_time.isoformat(),
        doctor_name=doctor.name if doctor else "",
    )


@mcp.tool()
@mcp_tool_logger("appointment-mcp")
async def cancel_appointment(
    appointment_id: str,
    reason: str = "",
    cancelled_by: str = "patient",
) -> dict:
    """
    Cancel appointment.
    Frees slot. Publishes cancellation event to Redis.
    """
    from app.domains.appointments.models import Appointment, Slot
    from app.utils.redis import get_redis
    import json

    async with AsyncSessionLocal() as db:
        appt = await db.get(Appointment, appointment_id)
        if not appt:
            return {"success": False, "reason": "not_found"}
        if appt.status.value in ("cancelled", "completed", "no_show"):
            return {"success": False, "reason": f"already_{appt.status.value}"}

        slot_id = appt.slot_id
        appt.status = "cancelled"
        appt.cancelled_at = datetime.utcnow()
        appt.cancellation_reason = reason

        if slot_id:
            slot = await db.get(Slot, slot_id)
            if slot:
                slot.status = "available"
                slot.appointment_id = None

        await db.commit()

    # Publish to SlotSaver
    redis = await get_redis()
    await redis.xadd("cancellation_events", {"data": json.dumps({
        "appointment_id": appointment_id,
        "slot_id": slot_id,
        "cancelled_by": cancelled_by,
        "reason": reason,
        "cancelled_at": datetime.utcnow().isoformat(),
    })})

    return {"success": True, "slot_id": slot_id}


@mcp.tool()
@mcp_tool_logger("appointment-mcp")
async def get_doctor_queue(
    doctor_id: str,
    date: Optional[str] = None,
) -> list[QueueEntry]:
    """Today's appointment queue for a doctor."""
    from app.domains.appointments.models import Appointment
    from app.domains.auth.models import Patient
    from datetime import date as date_type

    target = datetime.fromisoformat(date).date() if date else date_type.today()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Appointment, Patient)
            .join(Patient, Patient.id == Appointment.patient_id)
            .where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.slot_time >= datetime.combine(target, datetime.min.time()),
                    Appointment.slot_time < datetime.combine(
                        target + timedelta(days=1), datetime.min.time()
                    ),
                    Appointment.status.notin_(["cancelled"]),
                )
            )
            .order_by(Appointment.slot_time)
        )
        rows = result.all()

    return [
        QueueEntry(
            appointment_id=appt.id,
            patient_id=patient.id,
            patient_name=patient.name,
            time=appt.slot_time.strftime("%I:%M %p"),
            reason=appt.reason or "",
            status=appt.status.value,
            is_new_patient=bool(appt.is_new_patient),
            wait_minutes=None,
        )
        for appt, patient in rows
    ]


@mcp.tool()
@mcp_tool_logger("appointment-mcp")
async def confirm_appointment(appointment_id: str) -> dict:
    """Mark appointment as confirmed (patient responded YES)."""
    from app.domains.appointments.models import Appointment
    async with AsyncSessionLocal() as db:
        appt = await db.get(Appointment, appointment_id)
        if not appt:
            return {"success": False}
        appt.status = "confirmed"
        await db.commit()
    return {"success": True}


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8002)
```

---

## 3. WAITLIST MCP

```python
# mcp/waitlist/server.py
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from app.database import AsyncSessionLocal
from sqlalchemy import select, and_
from mcp.base import mcp_tool_logger

mcp = FastMCP("waitlist-mcp", version="1.0")


class WaitlistEntry(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    specialty: str
    priority_score: float
    wait_days: int
    distance_km: float
    preferred_channel: str
    urgency: str


class RankedWaitlist(BaseModel):
    entries: list[WaitlistEntry]
    total: int
    slot_specialty: str


@mcp.tool()
@mcp_tool_logger("waitlist-mcp")
async def score_waitlist(
    slot_id: str,
    specialty: str,
    doctor_id: Optional[str] = None,
) -> RankedWaitlist:
    """
    Rank waitlisted patients for cancelled slot.
    Score = wait*0.30 + urgency*0.25 + proximity*0.20
            + acceptance*0.15 + specialty_match*0.10
    """
    from app.domains.appointments.models import Waitlist
    from app.domains.auth.models import Patient

    async with AsyncSessionLocal() as db:
        q = (
            select(Waitlist, Patient)
            .join(Patient, Patient.id == Waitlist.patient_id)
            .where(
                and_(
                    Waitlist.specialty == specialty,
                    Waitlist.is_active == True,
                )
            )
        )
        result = await db.execute(q)
        rows = result.all()

    ranked = []
    for wl, patient in rows:
        prefs = patient.preferences or {}
        dist = float(patient.distance_km or 10)

        score = (
            min(wl.wait_days / 30, 1.0)     * 0.30 +
            {"low":0.3,"medium":0.6,"high":1.0}.get(wl.urgency,"medium") * 0.25 +
            max(0, 1 - dist / 25)            * 0.20 +
            0.65                             * 0.15 +   # default accept prob
            1.0                              * 0.10     # specialty match
        )

        ranked.append(WaitlistEntry(
            id=wl.id,
            patient_id=patient.id,
            patient_name=patient.name,
            specialty=wl.specialty,
            priority_score=round(score, 3),
            wait_days=wl.wait_days or 0,
            distance_km=dist,
            preferred_channel=prefs.get("preferred_channel", "whatsapp"),
            urgency=wl.urgency or "low",
        ))

    ranked.sort(key=lambda x: x.priority_score, reverse=True)
    return RankedWaitlist(
        entries=ranked[:10],
        total=len(ranked),
        slot_specialty=specialty,
    )


@mcp.tool()
@mcp_tool_logger("waitlist-mcp")
async def add_to_waitlist(
    patient_id: str,
    specialty: str,
    doctor_id: Optional[str] = None,
    urgency: str = "low",
) -> dict:
    import uuid
    from app.domains.appointments.models import Waitlist
    async with AsyncSessionLocal() as db:
        entry = Waitlist(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            specialty=specialty,
            doctor_id=doctor_id,
            urgency=urgency,
            wait_days=0,
            is_active=True,
        )
        db.add(entry)
        await db.commit()
    return {"success": True, "waitlist_id": entry.id}


@mcp.tool()
@mcp_tool_logger("waitlist-mcp")
async def remove_from_waitlist(
    patient_id: str,
    specialty: Optional[str] = None,
) -> dict:
    from app.domains.appointments.models import Waitlist
    async with AsyncSessionLocal() as db:
        q = select(Waitlist).where(
            and_(Waitlist.patient_id == patient_id, Waitlist.is_active == True)
        )
        if specialty:
            q = q.where(Waitlist.specialty == specialty)
        result = await db.execute(q)
        for entry in result.scalars().all():
            entry.is_active = False
        await db.commit()
    return {"success": True}


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8003)
```

---

## 4. DOCTOR MCP

```python
# mcp/doctor/server.py
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from app.database import AsyncSessionLocal
from mcp.base import mcp_tool_logger

mcp = FastMCP("doctor-mcp", version="1.0")


class DoctorProfile(BaseModel):
    id: str
    name: str
    specialty: str
    qualification: str
    registration_no: str
    phone: str
    consultation_fee_inr: int
    rating: float
    clinic_id: str


class AvailabilitySlot(BaseModel):
    slot_id: str
    start_time: str
    end_time: str
    status: str


@mcp.tool()
@mcp_tool_logger("doctor-mcp")
async def lookup_doctor(doctor_id: str) -> DoctorProfile:
    from app.domains.auth.models import Doctor
    async with AsyncSessionLocal() as db:
        doc = await db.get(Doctor, doctor_id)
        if not doc:
            raise ValueError(f"Doctor {doctor_id} not found")
        return DoctorProfile(
            id=doc.id,
            name=doc.name,
            specialty=doc.specialty or "",
            qualification=doc.qualification or "",
            registration_no=doc.registration_no or "",
            phone=doc.phone or "",
            consultation_fee_inr=doc.consultation_fee_inr or 0,
            rating=float(doc.rating or 4.5),
            clinic_id=doc.clinic_id or "",
        )


@mcp.tool()
@mcp_tool_logger("doctor-mcp")
async def get_doctor_availability(
    doctor_id: str,
    days_ahead: int = 7,
) -> list[AvailabilitySlot]:
    from app.domains.appointments.models import Slot
    from datetime import datetime, timedelta

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, and_
        result = await db.execute(
            select(Slot).where(
                and_(
                    Slot.doctor_id == doctor_id,
                    Slot.status == "available",
                    Slot.start_time >= datetime.now(),
                    Slot.start_time <= datetime.now() + timedelta(days=days_ahead),
                )
            ).order_by(Slot.start_time).limit(30)
        )
        slots = result.scalars().all()

    return [
        AvailabilitySlot(
            slot_id=s.id,
            start_time=s.start_time.isoformat(),
            end_time=s.end_time.isoformat(),
            status=s.status.value,
        )
        for s in slots
    ]


@mcp.tool()
@mcp_tool_logger("doctor-mcp")
async def get_doctors_by_specialty(
    specialty: str,
    available_today: bool = False,
) -> list[DoctorProfile]:
    from app.domains.auth.models import Doctor
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Doctor).where(Doctor.specialty == specialty)
        )
        doctors = result.scalars().all()

    return [
        DoctorProfile(
            id=d.id, name=d.name, specialty=d.specialty or "",
            qualification=d.qualification or "",
            registration_no=d.registration_no or "",
            phone=d.phone or "",
            consultation_fee_inr=d.consultation_fee_inr or 0,
            rating=float(d.rating or 4.5),
            clinic_id=d.clinic_id or "",
        )
        for d in doctors
    ]


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8004)
```

---

## 5. KNOWLEDGE MCP (RAG)

```python
# mcp/knowledge/server.py
"""
RAG-powered knowledge retrieval.
Hybrid search: vector + BM25 + RRF.
Grounds clinical decisions in real guidelines.
"""
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional
from mcp.base import mcp_tool_logger

mcp = FastMCP("knowledge-mcp", version="1.0")


class KnowledgeResult(BaseModel):
    content: str
    source: str
    relevance_score: float
    chunk_id: str


class DrugInfo(BaseModel):
    name: str
    generic_name: str
    category: str
    common_dosages: list[str]
    indications: list[str]
    contraindications: list[str]
    common_interactions: list[str]
    instructions: str
    available_in_india: bool


class InteractionResult(BaseModel):
    drug_a: str
    drug_b: str
    interaction_found: bool
    severity: Optional[str]       # mild | moderate | severe
    description: Optional[str]
    recommendation: Optional[str]


class ClinicalPathway(BaseModel):
    symptoms: list[str]
    recommended_specialty: str
    urgency_indicators: list[str]
    red_flags: list[str]
    when_to_escalate: str


# Static drug database (mock for MVP — replace with real DB + RAG)
DRUG_DB = {
    "atorvastatin": DrugInfo(
        name="Atorvastatin", generic_name="Atorvastatin Calcium",
        category="HMG-CoA Reductase Inhibitor (Statin)",
        common_dosages=["10mg", "20mg", "40mg", "80mg"],
        indications=["Hyperlipidemia", "Cardiovascular risk reduction", "Dyslipidemia"],
        contraindications=["Active liver disease", "Pregnancy", "Breastfeeding"],
        common_interactions=["Warfarin", "Clarithromycin", "Itraconazole", "Cyclosporine"],
        instructions="Take at bedtime. Avoid grapefruit juice. Monitor LFTs.",
        available_in_india=True,
    ),
    "aspirin": DrugInfo(
        name="Aspirin", generic_name="Acetylsalicylic Acid",
        category="Antiplatelet / NSAID",
        common_dosages=["75mg", "150mg", "325mg"],
        indications=["Antiplatelet", "Cardiovascular risk", "Fever", "Pain"],
        contraindications=["Active GI bleed", "Aspirin hypersensitivity", "Children <12"],
        common_interactions=["Warfarin", "Ibuprofen", "Clopidogrel", "Methotrexate"],
        instructions="Take with food. Do not crush. Report unusual bleeding.",
        available_in_india=True,
    ),
    "metformin": DrugInfo(
        name="Metformin", generic_name="Metformin Hydrochloride",
        category="Biguanide (Antidiabetic)",
        common_dosages=["500mg", "850mg", "1000mg"],
        indications=["Type 2 Diabetes", "Pre-diabetes", "PCOS"],
        contraindications=["eGFR <30", "Iodinated contrast (hold 48h)", "Severe hepatic disease"],
        common_interactions=["Alcohol", "Cimetidine", "Iodinated contrast"],
        instructions="Take with meals to reduce GI side effects. Monitor renal function.",
        available_in_india=True,
    ),
    "amlodipine": DrugInfo(
        name="Amlodipine", generic_name="Amlodipine Besylate",
        category="Calcium Channel Blocker",
        common_dosages=["2.5mg", "5mg", "10mg"],
        indications=["Hypertension", "Angina", "Coronary artery disease"],
        contraindications=["Cardiogenic shock", "Amlodipine hypersensitivity"],
        common_interactions=["Simvastatin (max 20mg)", "Cyclosporine", "Tacrolimus"],
        instructions="Take at same time daily. Monitor for peripheral edema.",
        available_in_india=True,
    ),
}

INTERACTION_DB = {
    ("aspirin", "ibuprofen"): InteractionResult(
        drug_a="Aspirin", drug_b="Ibuprofen",
        interaction_found=True, severity="moderate",
        description="Ibuprofen may interfere with aspirin's antiplatelet effect and increase GI bleeding risk.",
        recommendation="Avoid combination. If NSAID needed, use COX-2 inhibitor.",
    ),
    ("warfarin", "aspirin"): InteractionResult(
        drug_a="Warfarin", drug_b="Aspirin",
        interaction_found=True, severity="severe",
        description="Significantly increased bleeding risk when combined.",
        recommendation="Avoid unless cardiology-indicated. Requires close INR monitoring.",
    ),
    ("metformin", "alcohol"): InteractionResult(
        drug_a="Metformin", drug_b="Alcohol",
        interaction_found=True, severity="moderate",
        description="Increased lactic acidosis risk.",
        recommendation="Advise patient to avoid alcohol while on Metformin.",
    ),
}

SYMPTOM_PATHWAYS = {
    "chest pain": ClinicalPathway(
        symptoms=["chest pain", "chest tightness", "chest pressure"],
        recommended_specialty="Cardiology",
        urgency_indicators=["shortness of breath", "jaw pain", "left arm pain", "sweating"],
        red_flags=["crushing chest pain", "radiation to left arm", "diaphoresis", "syncope"],
        when_to_escalate="Any chest pain with red flags → immediate escalation",
    ),
    "knee pain": ClinicalPathway(
        symptoms=["knee pain", "joint pain", "knee swelling"],
        recommended_specialty="Orthopaedics",
        urgency_indicators=["inability to bear weight", "acute trauma", "locked joint"],
        red_flags=["acute trauma with deformity", "septic joint signs (fever + swelling)"],
        when_to_escalate="Acute trauma or septic joint signs → escalate",
    ),
}


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_drug_info(drug_name: str) -> DrugInfo | None:
    """Retrieve drug information from knowledge base."""
    key = drug_name.lower().strip()
    return DRUG_DB.get(key)


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def check_drug_interaction(drug_a: str, drug_b: str) -> InteractionResult:
    """Check interaction between two drugs."""
    key1 = (drug_a.lower(), drug_b.lower())
    key2 = (drug_b.lower(), drug_a.lower())
    result = INTERACTION_DB.get(key1) or INTERACTION_DB.get(key2)
    if result:
        return result
    return InteractionResult(
        drug_a=drug_a, drug_b=drug_b,
        interaction_found=False,
        severity=None, description=None, recommendation=None,
    )


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_symptom_pathway(symptoms_raw: str) -> ClinicalPathway | None:
    """
    Map symptoms to clinical pathway.
    Simple keyword match for MVP.
    Replace with Qdrant RAG retrieval in production.
    """
    s = symptoms_raw.lower()
    for keyword, pathway in SYMPTOM_PATHWAYS.items():
        if keyword in s:
            return pathway
    return None


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_red_flags(symptoms_raw: str) -> list[str]:
    """Extract red flags from symptoms string."""
    pathway = await retrieve_symptom_pathway(symptoms_raw)
    return pathway.red_flags if pathway else []


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_drug_guidelines(
    diagnosis: str,
    specialty: str,
) -> str:
    """
    Retrieve clinical prescribing guidelines for a diagnosis.
    MVP: rule-based. Production: Qdrant RAG.
    """
    guidelines = {
        "hypertension": (
            "First-line: ACE inhibitor or ARB + calcium channel blocker (amlodipine). "
            "Add thiazide diuretic if BP not controlled. Target: <130/80 for most patients. "
            "Indian guidelines (API 2023): prefer generic drugs, monitor electrolytes."
        ),
        "hyperlipidemia": (
            "High-intensity statin (atorvastatin 40-80mg) for high CV risk. "
            "Moderate-intensity for others. Recheck lipids in 6-8 weeks. "
            "Lifestyle modification essential. Monitor LFTs at baseline and 3 months."
        ),
        "type 2 diabetes": (
            "Metformin first-line unless contraindicated (eGFR <30). "
            "Add SGLT2 inhibitor or GLP-1 if CV disease present. "
            "HbA1c target: <7% for most. Check renal function before prescribing."
        ),
    }
    d = diagnosis.lower()
    for key, guideline in guidelines.items():
        if key in d:
            return guideline
    return ""


@mcp.tool()
@mcp_tool_logger("knowledge-mcp")
async def retrieve_dosage(
    drug_name: str,
    condition: str,
    patient_age: int = 40,
    patient_weight_kg: float = 65,
) -> dict:
    """Retrieve appropriate dosage for patient profile."""
    drug = DRUG_DB.get(drug_name.lower())
    if not drug:
        return {"found": False}

    # Age/weight adjustments
    dose = drug.common_dosages[1] if len(drug.common_dosages) > 1 else drug.common_dosages[0]
    if patient_age > 65:
        dose = drug.common_dosages[0]    # start low in elderly
    if patient_weight_kg < 50:
        dose = drug.common_dosages[0]    # start low in low weight

    return {
        "found": True,
        "drug": drug.name,
        "recommended_dose": dose,
        "frequency": "Once daily" if "0-0-1" in drug.common_dosages else "As prescribed",
        "instructions": drug.instructions,
        "adjustments": "Start low in elderly (>65) or low weight (<50kg)" if patient_age > 65 else "",
    }


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8006)
```

---

## 6. ANALYTICS MCP

```python
# mcp/analytics/server.py
from fastmcp import FastMCP
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from mcp.base import mcp_tool_logger
from datetime import datetime, timedelta

mcp = FastMCP("analytics-mcp", version="1.0")


class ProtectionMetrics(BaseModel):
    revenue_protected_inr: int
    protection_rate: float
    avg_fill_time_seconds: float
    no_shows_prevented: int
    escalations: int
    escalation_resolution_rate: float
    sessions_total: int
    sessions_recovered: int
    sessions_lost: int


@mcp.tool()
@mcp_tool_logger("analytics-mcp")
async def get_protection_metrics(
    doctor_id: str | None = None,
    days: int = 30,
) -> ProtectionMetrics:
    from app.domains.slotsaver.models import RecoverySession, Escalation
    from sqlalchemy import select, and_, func

    since = datetime.now() - timedelta(days=days)

    async with AsyncSessionLocal() as db:
        q = select(RecoverySession).where(RecoverySession.started_at >= since)
        result = await db.execute(q)
        sessions = result.scalars().all()

        esc_result = await db.execute(
            select(Escalation).where(Escalation.notified_at >= since)
        )
        escalations = esc_result.scalars().all()

    recovered = [s for s in sessions if s.outcome == "recovered"]
    lost      = [s for s in sessions if s.outcome == "lost"]
    resolved  = [e for e in escalations if e.status == "resolved"]

    total_revenue = sum(s.revenue_inr or 0 for s in recovered)
    avg_fill = (sum(s.fill_time_seconds or 0 for s in recovered) / len(recovered)
                if recovered else 0)

    return ProtectionMetrics(
        revenue_protected_inr=total_revenue,
        protection_rate=len(recovered) / len(sessions) if sessions else 0,
        avg_fill_time_seconds=avg_fill,
        no_shows_prevented=len(recovered),
        escalations=len(escalations),
        escalation_resolution_rate=len(resolved) / len(escalations) if escalations else 0,
        sessions_total=len(sessions),
        sessions_recovered=len(recovered),
        sessions_lost=len(lost),
    )


@mcp.tool()
@mcp_tool_logger("analytics-mcp")
async def log_agent_run(
    session_id: str,
    agent_name: str,
    input_json: dict,
    output_json: dict,
    tokens_used: int,
    latency_ms: int,
    success: bool,
    error: str = "",
) -> dict:
    """Persist agent run to DB."""
    import uuid
    from app.domains.analytics.models import AgentRun
    async with AsyncSessionLocal() as db:
        run = AgentRun(
            id=str(uuid.uuid4()),
            session_id=session_id,
            agent_name=agent_name,
            input_json=input_json,
            output_json=output_json,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
            success=success,
            error=error,
        )
        db.add(run)
        await db.commit()
    return {"logged": True}


@mcp.tool()
@mcp_tool_logger("analytics-mcp")
async def get_channel_effectiveness(days: int = 30) -> list[dict]:
    from app.domains.slotsaver.models import InterventionLog
    from sqlalchemy import select, func
    from datetime import datetime, timedelta

    since = datetime.now() - timedelta(days=days)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InterventionLog).where(InterventionLog.sent_at >= since)
        )
        logs = result.scalars().all()

    by_channel: dict[str, dict] = {}
    for log in logs:
        ch = log.channel or "unknown"
        if ch not in by_channel:
            by_channel[ch] = {"total": 0, "confirmed": 0}
        by_channel[ch]["total"] += 1
        if log.outcome == "confirmed":
            by_channel[ch]["confirmed"] += 1

    return [
        {
            "channel": ch,
            "total": v["total"],
            "confirmed": v["confirmed"],
            "rate": round(v["confirmed"] / v["total"], 3) if v["total"] > 0 else 0,
        }
        for ch, v in by_channel.items()
    ]


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8007)
```

---

## 7. LAUNCH ALL SERVERS

```python
# mcp/launch.py
"""Launch all MCP servers as subprocesses."""
import subprocess
import sys

SERVERS = [
    ("mcp/patient/server.py",     8001),
    ("mcp/appointment/server.py", 8002),
    ("mcp/waitlist/server.py",    8003),
    ("mcp/doctor/server.py",      8004),
    ("mcp/knowledge/server.py",   8006),
    ("mcp/analytics/server.py",   8007),
]

processes = []
for path, port in SERVERS:
    p = subprocess.Popen([sys.executable, path])
    processes.append(p)
    print(f"Started {path} on port {port}")

try:
    for p in processes:
        p.wait()
except KeyboardInterrupt:
    for p in processes:
        p.terminate()
```

```bash
# Start all MCP servers
python mcp/launch.py

# Or individually
python mcp/patient/server.py
python mcp/appointment/server.py
python mcp/knowledge/server.py

# Test a tool
curl -X POST http://localhost:8001/tools/lookup_patient \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "P-1000"}'
```

---

## RULES

```
1. Every tool logs via mcp_tool_logger — never skip
2. book_appointment checks slot.status atomically — no race conditions
3. cancel_appointment publishes Redis event — always triggers SlotSaver
4. Knowledge MCP: mock DB for MVP, swap Qdrant RAG in production
5. All tools return Pydantic models — never raw dicts
6. Tool failure raises exception — never returns None silently
7. Waitlist score_waitlist returns top 10 max — prevent overcontacting
8. Agent never calls DB directly — all access via MCP tools
9. Versioned servers (version="1.0") — v2 adds tools, never removes
10. mcp_tool_calls_stream drained to DB by Celery worker every 60s
```
