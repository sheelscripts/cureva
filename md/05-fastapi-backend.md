# CUREVA — FastAPI Backend
### Prompt 05 of 20
### Role: Senior Python Backend Engineer

---

## ROLE

Senior Python backend engineer. Build complete Cureva FastAPI backend.
Production-grade. Async throughout. Matches frontend mock data shapes exactly.
No placeholder logic. Every endpoint fully implemented.

---

## STACK

```
Python 3.11
FastAPI (async)
SQLAlchemy 2.0 (async ORM)
Alembic (migrations)
Pydantic v2 (schemas)
asyncpg (PostgreSQL driver)
Redis (aioredis)
Supabase (PostgreSQL host)
Langfuse (tracing — stub for now)
python-jose (JWT)
passlib (password hashing)
python-multipart (file upload)
celery + redis (async jobs)
httpx (internal HTTP)
```

---

## PROJECT STRUCTURE

```
backend/
├── app/
│   ├── main.py                  ← FastAPI app, lifespan, CORS
│   ├── config.py                ← Settings via pydantic-settings
│   ├── database.py              ← Async engine, session factory
│   ├── dependencies.py          ← get_db, get_current_user, role guards
│   │
│   ├── models/                  ← SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── patient.py
│   │   ├── doctor.py
│   │   ├── appointment.py
│   │   ├── clinical.py
│   │   ├── slotsaver.py
│   │   └── analytics.py
│   │
│   ├── schemas/                 ← Pydantic v2 request/response schemas
│   │   ├── patient.py
│   │   ├── doctor.py
│   │   ├── appointment.py
│   │   ├── clinical.py
│   │   ├── slotsaver.py
│   │   └── analytics.py
│   │
│   ├── routers/                 ← FastAPI routers
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── doctors.py
│   │   ├── appointments.py
│   │   ├── clinical.py
│   │   ├── slotsaver.py
│   │   ├── analytics.py
│   │   └── notifications.py
│   │
│   ├── services/                ← Business logic layer
│   │   ├── patient_service.py
│   │   ├── appointment_service.py
│   │   ├── slotsaver_service.py
│   │   ├── clinical_service.py
│   │   ├── pdf_service.py
│   │   └── notification_service.py
│   │
│   ├── middleware/
│   │   ├── audit.py             ← DPDP audit trail on every data access
│   │   ├── rate_limit.py
│   │   └── logging.py
│   │
│   └── utils/
│       ├── redis.py
│       ├── pagination.py
│       └── exceptions.py
│
├── migrations/                  ← Alembic
│   ├── env.py
│   └── versions/
│       ├── 001_initial_schema.py
│       └── 002_seed_data.py
│
├── tests/
│   ├── conftest.py
│   ├── test_appointments.py
│   ├── test_slotsaver.py
│   └── test_clinical.py
│
├── pyproject.toml
├── alembic.ini
└── .env.example
```

---

## CONFIG

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str           # postgresql+asyncpg://...
    REDIS_URL: str              # redis://localhost:6379
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    SUPABASE_URL: str
    SUPABASE_KEY: str
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## DATABASE SETUP

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

---

## MODELS

### User + Patient + Doctor

```python
# app/models/user.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"
    frontdesk = "frontdesk"

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

```python
# app/models/patient.py
from sqlalchemy import String, Float, ForeignKey, JSON, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(20))
    dob: Mapped[str] = mapped_column(Date)
    blood_group: Mapped[str] = mapped_column(String(5))
    address: Mapped[str] = mapped_column(String(500))
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    # preferences schema:
    # { preferred_doctor_id, preferred_language, preferred_window,
    #   preferred_channel, recurring_schedule_days, avoid_days }
```

```python
# app/models/doctor.py
class Doctor(Base):
    __tablename__ = "doctors"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    specialty: Mapped[str] = mapped_column(String(100))
    registration_no: Mapped[str] = mapped_column(String(50))
    clinic_id: Mapped[str] = mapped_column(ForeignKey("clinics.id"))
    schedule_config: Mapped[dict] = mapped_column(JSON, default=dict)
    # schedule_config: { working_days, start_time, end_time, slot_duration_minutes }
```

### Appointments + Slots

```python
# app/models/appointment.py
import enum

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"

class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"))
    slot_time: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[AppointmentStatus] = mapped_column(SAEnum(AppointmentStatus))
    specialty: Mapped[str] = mapped_column(String(100))
    value_inr: Mapped[int] = mapped_column(default=0)
    reason: Mapped[str] = mapped_column(String(500), default="")
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Slot(Base):
    __tablename__ = "slots"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="available")
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)

class Waitlist(Base):
    __tablename__ = "waitlist"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    specialty: Mapped[str] = mapped_column(String(100))
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

### Clinical

```python
# app/models/clinical.py
class Prescription(Base):
    __tablename__ = "prescriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"))
    diagnosis: Mapped[str] = mapped_column(String(500))
    medicines: Mapped[list] = mapped_column(JSON, default=list)
    # medicines: [{ name, strength, dosage, duration, instructions }]
    tests_ordered: Mapped[list] = mapped_column(JSON, default=list)
    instructions: Mapped[str] = mapped_column(String(1000), default="")
    follow_up_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    pdf_url: Mapped[str] = mapped_column(String(500), default="")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"), unique=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"))
    scribe_transcript: Mapped[str] = mapped_column(String, default="")
    subjective: Mapped[str] = mapped_column(String(2000), default="")
    objective: Mapped[dict] = mapped_column(JSON, default=dict)
    # objective: { bp, weight, heart_rate, other }
    assessment: Mapped[str] = mapped_column(String(1000), default="")
    plan: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class LabOrder(Base):
    __tablename__ = "lab_orders"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"))
    tests: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="ordered")
    results_url: Mapped[str] = mapped_column(String(500), default="")
    ordered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class MedicalHistory(Base):
    __tablename__ = "medical_history"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    condition: Mapped[str] = mapped_column(String(200))
    diagnosed_at: Mapped[str] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str] = mapped_column(String(500), default="")
```

### SlotSaver

```python
# app/models/slotsaver.py
class RiskScore(Base):
    __tablename__ = "risk_scores"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    score: Mapped[float] = mapped_column(Float)
    tier: Mapped[str] = mapped_column(String(20))
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    top_factors: Mapped[list] = mapped_column(JSON, default=list)
    planned_intervention: Mapped[str] = mapped_column(String(20), default="")
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class RecoverySession(Base):
    __tablename__ = "recovery_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), default="active")
    # outcome: active | recovered | escalated | lost
    fill_time_seconds: Mapped[int | None] = mapped_column(nullable=True)
    revenue_inr: Mapped[int] = mapped_column(default=0)
    patients_contacted: Mapped[int] = mapped_column(default=0)

class OutreachLog(Base):
    __tablename__ = "outreach_log"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("recovery_sessions.id"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    rank: Mapped[int] = mapped_column()
    message: Mapped[str] = mapped_column(String(1000))
    channel: Mapped[str] = mapped_column(String(20))
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    response: Mapped[str | None] = mapped_column(String(100), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class Escalation(Base):
    __tablename__ = "escalations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("recovery_sessions.id"))
    reason: Mapped[str] = mapped_column(String(50))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    notified_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(20), default="open")

class InterventionLog(Base):
    __tablename__ = "intervention_log"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"))
    channel: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(String(1000))
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    response: Mapped[str | None] = mapped_column(String(100), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), default="pending")
```

---

## SCHEMAS (Pydantic v2)

```python
# app/schemas/appointment.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    slot_id: str
    reason: str = ""

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    slot_time: datetime
    status: str
    specialty: str
    value_inr: int
    reason: str
    created_at: datetime
    model_config = {"from_attributes": True}

class SlotResponse(BaseModel):
    id: str
    doctor_id: str
    start_time: datetime
    end_time: datetime
    status: str
    model_config = {"from_attributes": True}

class BookingConfirmation(BaseModel):
    appointment_id: str
    slot_time: datetime
    doctor_name: str
    specialty: str
    location: str
    confirmation_sent: bool
```

```python
# app/schemas/slotsaver.py
class RiskScoreResponse(BaseModel):
    appointment_id: str
    patient_id: str
    patient_name: str
    slot_time: datetime
    score: float
    tier: str  # low | medium | high | critical
    top_factors: list[str]
    planned_intervention: str
    model_config = {"from_attributes": True}

class RecoverySessionResponse(BaseModel):
    id: str
    slot_id: str
    started_at: datetime
    outcome: str
    fill_time_seconds: Optional[int]
    revenue_inr: int
    patients_contacted: int
    waitlist: list[dict]
    messages: list[dict]
    model_config = {"from_attributes": True}

class EscalationResponse(BaseModel):
    id: str
    session_id: str
    reason: str
    payload: dict
    notified_at: datetime
    status: str
    model_config = {"from_attributes": True}
```

---

## ROUTERS

### Auth

```python
# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/register")
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Create user + patient/doctor record based on role
    ...

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### Patients

```python
# app/routers/patients.py
router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(patient_id: str, db=Depends(get_db), user=Depends(require_role(["doctor","admin","patient"]))):
    return await patient_service.get_patient_detail(db, patient_id)

@router.get("/{patient_id}/appointments", response_model=list[AppointmentResponse])
async def get_patient_appointments(patient_id: str, status: str | None = None, db=Depends(get_db)):
    return await appointment_service.get_patient_appointments(db, patient_id, status)

@router.get("/{patient_id}/prescriptions", response_model=list[PrescriptionResponse])
async def get_prescriptions(patient_id: str, db=Depends(get_db)):
    return await clinical_service.get_prescriptions(db, patient_id)

@router.get("/{patient_id}/lab-reports", response_model=list[LabOrderResponse])
async def get_lab_reports(patient_id: str, db=Depends(get_db)):
    return await clinical_service.get_lab_orders(db, patient_id)

@router.get("/{patient_id}/medical-history", response_model=list[MedicalHistoryResponse])
async def get_medical_history(patient_id: str, db=Depends(get_db)):
    return await patient_service.get_medical_history(db, patient_id)

@router.get("/{patient_id}/timeline")
async def get_health_timeline(patient_id: str, db=Depends(get_db)):
    return await patient_service.get_health_timeline(db, patient_id)

@router.get("/{patient_id}/ai-summary")
async def get_ai_summary(patient_id: str, appointment_id: str, db=Depends(get_db)):
    # Calls scribe service to generate pre-appointment summary
    return await clinical_service.generate_patient_summary(db, patient_id, appointment_id)

@router.put("/{patient_id}/preferences")
async def update_preferences(patient_id: str, prefs: PatientPreferencesUpdate, db=Depends(get_db)):
    return await patient_service.update_preferences(db, patient_id, prefs)

@router.get("/search", response_model=list[PatientSummaryResponse])
async def search_patients(q: str, db=Depends(get_db), user=Depends(require_role(["doctor","admin"]))):
    return await patient_service.search_patients(db, q)
```

### Appointments

```python
# app/routers/appointments.py
router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/slots", response_model=list[SlotResponse])
async def get_available_slots(
    doctor_id: str,
    date_from: str,
    date_to: str,
    specialty: str | None = None,
    db=Depends(get_db)
):
    return await appointment_service.get_available_slots(db, doctor_id, date_from, date_to)

@router.post("/book", response_model=BookingConfirmation)
async def book_appointment(data: AppointmentCreate, db=Depends(get_db), user=Depends(get_current_user)):
    return await appointment_service.book_appointment(db, data)

@router.post("/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, reason: str = "", db=Depends(get_db)):
    # Cancellation triggers SlotSaver recovery session via Redis event
    result = await appointment_service.cancel_appointment(db, appointment_id, reason)
    await redis_client.publish("cancellation_events", json.dumps({
        "appointment_id": appointment_id,
        "slot_id": result.slot_id,
        "cancelled_at": datetime.utcnow().isoformat()
    }))
    return result

@router.post("/{appointment_id}/reschedule", response_model=BookingConfirmation)
async def reschedule_appointment(appointment_id: str, new_slot_id: str, db=Depends(get_db)):
    return await appointment_service.reschedule_appointment(db, appointment_id, new_slot_id)

@router.get("/doctor/{doctor_id}/queue", response_model=list[QueueEntryResponse])
async def get_doctor_queue(doctor_id: str, date: str, db=Depends(get_db)):
    return await appointment_service.get_doctor_queue(db, doctor_id, date)

@router.post("/{appointment_id}/confirm")
async def confirm_appointment(appointment_id: str, db=Depends(get_db)):
    return await appointment_service.confirm_appointment(db, appointment_id)
```

### Clinical

```python
# app/routers/clinical.py
router = APIRouter(prefix="/clinical", tags=["clinical"])

@router.post("/prescriptions", response_model=PrescriptionResponse)
async def create_prescription(data: PrescriptionCreate, db=Depends(get_db), user=Depends(require_role(["doctor"]))):
    return await clinical_service.create_prescription(db, data)

@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(prescription_id: str, db=Depends(get_db)):
    return await clinical_service.get_prescription(db, prescription_id)

@router.post("/prescriptions/{prescription_id}/generate-pdf")
async def generate_pdf(prescription_id: str, db=Depends(get_db)):
    # Triggers Celery task — returns job_id
    job = generate_prescription_pdf_task.delay(prescription_id)
    return {"job_id": job.id, "status": "processing"}

@router.get("/prescriptions/{prescription_id}/pdf-status/{job_id}")
async def get_pdf_status(prescription_id: str, job_id: str):
    result = AsyncResult(job_id)
    if result.ready():
        return {"status": "done", "pdf_url": result.get()}
    return {"status": "processing"}

@router.post("/prescriptions/{prescription_id}/send")
async def send_prescription(prescription_id: str, channel: str, db=Depends(get_db)):
    return await notification_service.send_prescription(db, prescription_id, channel)

@router.post("/notes", response_model=ClinicalNoteResponse)
async def save_clinical_note(data: ClinicalNoteCreate, db=Depends(get_db)):
    return await clinical_service.save_note(db, data)

@router.get("/notes/{appointment_id}", response_model=ClinicalNoteResponse)
async def get_clinical_note(appointment_id: str, db=Depends(get_db)):
    return await clinical_service.get_note(db, appointment_id)

@router.post("/ai-suggestions")
async def get_medicine_suggestions(
    diagnosis: str,
    patient_id: str,
    db=Depends(get_db)
):
    # Calls Prescription Agent stub (Phase 2 = real agent)
    return await clinical_service.get_medicine_suggestions(db, diagnosis, patient_id)

@router.post("/drug-interaction-check")
async def check_drug_interaction(drugs: list[str]):
    return await clinical_service.check_interactions(drugs)
```

### SlotSaver

```python
# app/routers/slotsaver.py
router = APIRouter(prefix="/slotsaver", tags=["slotsaver"])

@router.get("/risk-scores/tomorrow", response_model=list[RiskScoreResponse])
async def get_tomorrow_risks(doctor_id: str | None = None, db=Depends(get_db)):
    return await slotsaver_service.get_tomorrow_risk_scores(db, doctor_id)

@router.get("/sessions/active", response_model=list[RecoverySessionResponse])
async def get_active_sessions(db=Depends(get_db)):
    return await slotsaver_service.get_active_sessions(db)

@router.get("/sessions/{session_id}", response_model=RecoverySessionResponse)
async def get_session(session_id: str, db=Depends(get_db)):
    return await slotsaver_service.get_session(db, session_id)

@router.post("/sessions/{session_id}/escalate")
async def escalate_session(session_id: str, db=Depends(get_db)):
    return await slotsaver_service.trigger_escalation(db, session_id)

@router.post("/sessions/{session_id}/extend")
async def extend_timer(session_id: str, extra_minutes: int = 5, db=Depends(get_db)):
    return await slotsaver_service.extend_session_timer(db, session_id, extra_minutes)

@router.post("/escalations/{escalation_id}/resolve")
async def resolve_escalation(escalation_id: str, resolved_by: str, db=Depends(get_db)):
    return await slotsaver_service.resolve_escalation(db, escalation_id, resolved_by)

@router.get("/escalations/open", response_model=list[EscalationResponse])
async def get_open_escalations(db=Depends(get_db)):
    return await slotsaver_service.get_open_escalations(db)

@router.get("/metrics/month", response_model=ProtectionMetricsResponse)
async def get_month_metrics(doctor_id: str | None = None, db=Depends(get_db)):
    return await slotsaver_service.get_monthly_metrics(db, doctor_id)

@router.get("/metrics/daily", response_model=list[DailyMetricResponse])
async def get_daily_metrics(days: int = 30, db=Depends(get_db)):
    return await slotsaver_service.get_daily_metrics(db, days)

@router.get("/interventions", response_model=list[InterventionLogResponse])
async def get_interventions(patient_id: str | None = None, status: str | None = None, db=Depends(get_db)):
    return await slotsaver_service.get_interventions(db, patient_id, status)

@router.post("/interventions/{appointment_id}/approve")
async def approve_intervention(appointment_id: str, db=Depends(get_db)):
    # Doctor approves auto-outreach for tomorrow
    return await slotsaver_service.approve_intervention(db, appointment_id)
```

### Analytics

```python
# app/routers/analytics.py
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/clinic/overview")
async def clinic_overview(db=Depends(get_db), user=Depends(require_role(["admin"]))):
    return await analytics_service.get_clinic_overview(db)

@router.get("/clinic/revenue")
async def revenue_analytics(days: int = 30, db=Depends(get_db)):
    return await analytics_service.get_revenue_analytics(db, days)

@router.get("/doctors/performance")
async def doctor_performance(db=Depends(get_db)):
    return await analytics_service.get_doctor_performance(db)

@router.get("/agents/health")
async def agent_health(db=Depends(get_db)):
    return await analytics_service.get_agent_health(db)
```

---

## MIDDLEWARE

### DPDP Audit Middleware

```python
# app/middleware/audit.py
from fastapi import Request
import json

AUDITABLE_PATHS = ["/patients/", "/clinical/", "/prescriptions/"]

async def audit_middleware(request: Request, call_next):
    response = await call_next(request)

    if any(request.url.path.startswith(p) for p in AUDITABLE_PATHS):
        user_id = request.headers.get("X-User-ID", "anonymous")
        await log_data_access(
            user_id=user_id,
            resource=request.url.path,
            method=request.method,
            ip=request.client.host,
            timestamp=datetime.utcnow(),
        )

    return response
```

---

## MAIN APP

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.routers import auth, patients, doctors, appointments, clinical, slotsaver, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await init_redis()
    yield
    # Shutdown
    await engine.dispose()
    await close_redis()

app = FastAPI(
    title="Cureva API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://cureva.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(audit_middleware)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(clinical.router)
app.include_router(slotsaver.router)
app.include_router(analytics.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

---

## ALEMBIC MIGRATION (001)

```python
# migrations/versions/001_initial_schema.py
def upgrade():
    op.execute("""
        CREATE TYPE userrole AS ENUM ('patient','doctor','admin','frontdesk');
        CREATE TYPE appointmentstatus AS ENUM
            ('scheduled','confirmed','in_progress','completed','cancelled','no_show');

        CREATE TABLE users (
            id VARCHAR PRIMARY KEY,
            email VARCHAR UNIQUE NOT NULL,
            hashed_password VARCHAR NOT NULL,
            role userrole NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE clinics (
            id VARCHAR PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            address VARCHAR(500),
            settings_json JSONB DEFAULT '{}'
        );

        CREATE TABLE patients (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR UNIQUE REFERENCES users(id),
            name VARCHAR(200) NOT NULL,
            phone VARCHAR(20),
            dob DATE,
            blood_group VARCHAR(5),
            address VARCHAR(500),
            distance_km FLOAT DEFAULT 0,
            preferences JSONB DEFAULT '{}'
        );

        CREATE TABLE doctors (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR UNIQUE REFERENCES users(id),
            name VARCHAR(200) NOT NULL,
            specialty VARCHAR(100),
            registration_no VARCHAR(50),
            clinic_id VARCHAR REFERENCES clinics(id),
            schedule_config JSONB DEFAULT '{}'
        );

        CREATE TABLE slots (
            id VARCHAR PRIMARY KEY,
            doctor_id VARCHAR REFERENCES doctors(id),
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            status VARCHAR(20) DEFAULT 'available',
            appointment_id VARCHAR
        );

        CREATE TABLE appointments (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            doctor_id VARCHAR REFERENCES doctors(id),
            slot_time TIMESTAMP NOT NULL,
            status appointmentstatus NOT NULL,
            specialty VARCHAR(100),
            value_inr INTEGER DEFAULT 0,
            reason VARCHAR(500) DEFAULT '',
            cancelled_at TIMESTAMP,
            cancellation_reason VARCHAR(200) DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE waitlist (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            specialty VARCHAR(100),
            doctor_id VARCHAR REFERENCES doctors(id),
            priority_score FLOAT DEFAULT 0,
            added_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE prescriptions (
            id VARCHAR PRIMARY KEY,
            appointment_id VARCHAR REFERENCES appointments(id),
            patient_id VARCHAR REFERENCES patients(id),
            doctor_id VARCHAR REFERENCES doctors(id),
            diagnosis VARCHAR(500),
            medicines JSONB DEFAULT '[]',
            tests_ordered JSONB DEFAULT '[]',
            instructions VARCHAR(1000) DEFAULT '',
            follow_up_date DATE,
            pdf_url VARCHAR(500) DEFAULT '',
            sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE clinical_notes (
            id VARCHAR PRIMARY KEY,
            appointment_id VARCHAR UNIQUE REFERENCES appointments(id),
            doctor_id VARCHAR REFERENCES doctors(id),
            scribe_transcript TEXT DEFAULT '',
            subjective VARCHAR(2000) DEFAULT '',
            objective JSONB DEFAULT '{}',
            assessment VARCHAR(1000) DEFAULT '',
            plan VARCHAR(1000) DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE lab_orders (
            id VARCHAR PRIMARY KEY,
            appointment_id VARCHAR REFERENCES appointments(id),
            tests JSONB DEFAULT '[]',
            status VARCHAR(20) DEFAULT 'ordered',
            results_url VARCHAR(500) DEFAULT '',
            ordered_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE medical_history (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            condition VARCHAR(200),
            diagnosed_at DATE,
            status VARCHAR(20) DEFAULT 'active',
            notes VARCHAR(500) DEFAULT ''
        );

        CREATE TABLE risk_scores (
            id VARCHAR PRIMARY KEY,
            appointment_id VARCHAR REFERENCES appointments(id),
            patient_id VARCHAR REFERENCES patients(id),
            score FLOAT,
            tier VARCHAR(20),
            features JSONB DEFAULT '{}',
            top_factors JSONB DEFAULT '[]',
            planned_intervention VARCHAR(20) DEFAULT '',
            computed_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE recovery_sessions (
            id VARCHAR PRIMARY KEY,
            slot_id VARCHAR REFERENCES slots(id),
            started_at TIMESTAMP DEFAULT NOW(),
            closed_at TIMESTAMP,
            outcome VARCHAR(20) DEFAULT 'active',
            fill_time_seconds INTEGER,
            revenue_inr INTEGER DEFAULT 0,
            patients_contacted INTEGER DEFAULT 0
        );

        CREATE TABLE outreach_log (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR REFERENCES recovery_sessions(id),
            patient_id VARCHAR REFERENCES patients(id),
            rank INTEGER,
            message VARCHAR(1000),
            channel VARCHAR(20),
            sent_at TIMESTAMP DEFAULT NOW(),
            response VARCHAR(100),
            responded_at TIMESTAMP
        );

        CREATE TABLE escalations (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR REFERENCES recovery_sessions(id),
            reason VARCHAR(50),
            payload JSONB DEFAULT '{}',
            notified_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP,
            resolved_by VARCHAR(100) DEFAULT '',
            status VARCHAR(20) DEFAULT 'open'
        );

        CREATE TABLE intervention_log (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            appointment_id VARCHAR REFERENCES appointments(id),
            channel VARCHAR(20),
            message VARCHAR(1000),
            sent_at TIMESTAMP DEFAULT NOW(),
            response VARCHAR(100),
            responded_at TIMESTAMP,
            outcome VARCHAR(20) DEFAULT 'pending'
        );

        CREATE TABLE scribe_sessions (
            id VARCHAR PRIMARY KEY,
            appointment_id VARCHAR REFERENCES appointments(id),
            audio_url VARCHAR(500) DEFAULT '',
            transcript TEXT DEFAULT '',
            status VARCHAR(20) DEFAULT 'active',
            started_at TIMESTAMP DEFAULT NOW(),
            ended_at TIMESTAMP
        );

        CREATE TABLE triage_sessions (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            symptoms_raw TEXT,
            urgency VARCHAR(20),
            specialty VARCHAR(100),
            confidence FLOAT,
            escalated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE agent_runs (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR,
            agent_name VARCHAR(50),
            input_json JSONB DEFAULT '{}',
            output_json JSONB DEFAULT '{}',
            tokens_used INTEGER DEFAULT 0,
            latency_ms INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE mcp_tool_calls (
            id VARCHAR PRIMARY KEY,
            agent_run_id VARCHAR REFERENCES agent_runs(id),
            tool_name VARCHAR(100),
            input_json JSONB DEFAULT '{}',
            output_json JSONB DEFAULT '{}',
            latency_ms INTEGER DEFAULT 0,
            success BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE eval_results (
            id VARCHAR PRIMARY KEY,
            session_id VARCHAR,
            agent VARCHAR(50),
            metric VARCHAR(100),
            score FLOAT,
            computed_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE prompt_versions (
            id VARCHAR PRIMARY KEY,
            agent VARCHAR(50),
            version VARCHAR(20),
            yaml_content TEXT,
            active BOOLEAN DEFAULT FALSE,
            eval_score FLOAT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE notifications (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR REFERENCES patients(id),
            type VARCHAR(50),
            payload JSONB DEFAULT '{}',
            channel VARCHAR(20),
            sent_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP
        );

        -- Indexes
        CREATE INDEX idx_appointments_patient ON appointments(patient_id);
        CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
        CREATE INDEX idx_appointments_slot_time ON appointments(slot_time);
        CREATE INDEX idx_risk_scores_appointment ON risk_scores(appointment_id);
        CREATE INDEX idx_risk_scores_score ON risk_scores(score DESC);
        CREATE INDEX idx_outreach_session ON outreach_log(session_id);
        CREATE INDEX idx_interventions_patient ON intervention_log(patient_id);
        CREATE INDEX idx_agent_runs_session ON agent_runs(session_id);
    """)
```

---

## ENV FILE

```bash
# .env.example
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/cureva
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here-min-32-chars
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
ENVIRONMENT=development
```

---

## STARTUP COMMANDS

```bash
# Install
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic \
  pydantic-settings python-jose[cryptography] passlib[bcrypt] \
  redis aioredis celery httpx python-multipart --break-system-packages

# Run migrations
alembic upgrade head

# Seed data (Phase 2 — matches frontend mock data exactly)
python -m app.scripts.seed

# Run server
uvicorn app.main:app --reload --port 8000

# API docs
open http://localhost:8000/docs
```

---

## RULES

```
1. Every router method calls service layer — no DB logic in routers
2. Service layer calls DB via SQLAlchemy only — no raw SQL except migrations
3. Cancellation endpoint MUST publish Redis event (SlotSaver trigger)
4. All patient data access logged via audit middleware
5. PDF generation is Celery task — never blocks HTTP response
6. Schemas match frontend mock data shapes exactly (same field names)
7. All IDs: VARCHAR not INTEGER (matches frontend mock string IDs)
8. Datetime: always UTC, ISO 8601 in responses
9. Error responses: { "detail": "specific message" } — never generic
10. Health endpoint: always returns 200 (used by Railway deploy checks)
```
