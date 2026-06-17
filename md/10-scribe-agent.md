# CUREVA — Scribe Agent
### Prompt 10 of 20
### Role: Senior AI Engineer

---

## ROLE

Build complete AI Scribe system.
Whisper STT → live transcript → SOAP extraction → alert detection.
Async pipeline. Never blocks UI. Streams to frontend via WebSocket.
Full runnable code. No stubs.

---

## PIPELINE

```
Doctor clicks [Start Recording]
         ↓
Browser captures audio (MediaRecorder API)
         ↓
WebSocket → backend (30s audio chunks)
         ↓
Whisper transcribes chunk
         ↓
ScribeAgent extracts SOAP delta from new text
         ↓
WebSocket pushes transcript + SOAP update to frontend
         ↓
Doctor clicks [End Appointment]
         ↓
Final SOAP assembled + saved
         ↓
AI alerts generated (HbA1c trending, drug flags...)
         ↓
[Generate Prescription] unlocked
```

---

## STACK

```
Whisper (openai/whisper local via faster-whisper)
faster-whisper    → 4x faster than openai whisper, same accuracy
WebSocket         → FastAPI WebSocket endpoint
Instructor        → structured SOAP extraction
Redis             → scribe session state persistence
Supabase Storage  → audio file storage (optional)
```

---

## 1. WHISPER SETUP

```python
# agents/scribe/stt.py
"""
faster-whisper: runs locally, no API cost.
Model: medium (good balance speed/accuracy for Indian English)
Supports: English, Hindi, Hinglish (auto-detect)
"""
from faster_whisper import WhisperModel
import numpy as np
import io
import wave
import tempfile
import os

# Load once on startup — keep in memory
_model: WhisperModel | None = None

def get_whisper() -> WhisperModel:
    global _model
    if _model is None:
        print("[scribe] Loading Whisper medium model...")
        _model = WhisperModel(
            "medium",
            device="cpu",           # use "cuda" if GPU available
            compute_type="int8",    # quantized — 2x faster on CPU
        )
        print("[scribe] Whisper ready")
    return _model


def transcribe_chunk(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe a raw audio chunk (WebM/WAV bytes).
    Returns: { text, segments, language, duration }
    """
    model = get_whisper()

    # Write to temp file (faster-whisper needs file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            beam_size=5,
            vad_filter=True,        # skip silence
            vad_parameters={
                "min_silence_duration_ms": 500,
                "speech_pad_ms": 200,
            },
            word_timestamps=True,
        )

        text_parts = []
        seg_list = []
        for seg in segments:
            text_parts.append(seg.text.strip())
            seg_list.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "words": [
                    {"word": w.word, "start": w.start, "end": w.end}
                    for w in (seg.words or [])
                ],
            })

        return {
            "text": " ".join(text_parts),
            "segments": seg_list,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
        }

    finally:
        os.unlink(tmp_path)


def detect_speaker(text: str, prev_speaker: str = "doctor") -> str:
    """
    Simple heuristic speaker diarization.
    Real diarization needs pyannote.audio (future).
    Heuristic: questions → doctor, answers → patient.
    """
    question_words = ["how", "when", "where", "what", "do you", "are you",
                      "have you", "did you", "can you", "any", "tell me"]
    text_lower = text.lower()
    is_question = (
        text.strip().endswith("?") or
        any(text_lower.startswith(w) for w in question_words)
    )
    return "doctor" if is_question else "patient"
```

---

## 2. SOAP EXTRACTOR

```python
# agents/scribe/extractor.py
"""
Extracts structured SOAP note from transcript chunks.
Runs every 30s on new transcript delta.
Merges with existing note — never overwrites confirmed fields.
"""
from pydantic import BaseModel
from typing import Optional
from agents.llm import call_llm


class SOAPDelta(BaseModel):
    """Incremental update to SOAP note from new transcript chunk."""
    subjective_additions: list[str]     # new symptoms/complaints mentioned
    objective_additions: dict           # new vitals mentioned {bp, weight, hr, temp}
    assessment_update: Optional[str]    # diagnosis mentioned
    plan_additions: list[str]           # new treatments/referrals mentioned
    tests_mentioned: list[str]          # labs/tests ordered
    medications_mentioned: list[str]    # drugs mentioned by name
    alerts: list[str]                   # red flags detected
    follow_up_mentioned: Optional[str]  # follow-up date/time if mentioned


class SOAPNote(BaseModel):
    subjective: str = ""
    objective: dict = {}                # {bp, weight, heart_rate, temperature, spo2, other}
    assessment: str = ""
    plan: str = ""
    tests_ordered: list[str] = []
    medications: list[str] = []
    follow_up_date: Optional[str] = None
    ai_alerts: list[str] = []


async def extract_soap_delta(
    new_transcript: str,
    existing_note: SOAPNote,
    session_id: str,
) -> SOAPDelta | None:
    """Extract what's new in this transcript chunk."""

    if len(new_transcript.strip()) < 20:
        return None    # not enough text to extract from

    return await call_llm(
        prompt=f"""
Extract structured clinical information from this new transcript segment.
Only extract what is explicitly mentioned — never infer or assume.

EXISTING NOTE (already captured — do not repeat):
Subjective: {existing_note.subjective or "empty"}
Assessment: {existing_note.assessment or "empty"}
Plan: {existing_note.plan or "empty"}

NEW TRANSCRIPT SEGMENT:
{new_transcript}

Extract ONLY new information not already in existing note:
- subjective_additions: new symptoms, complaints, patient history mentioned
- objective_additions: any vitals mentioned (bp like "120/80", weight in kg, heart rate)
- assessment_update: any diagnosis or condition named by doctor
- plan_additions: treatments, referrals, lifestyle advice mentioned
- tests_mentioned: any lab tests or imaging ordered
- medications_mentioned: any drug names mentioned
- alerts: medical red flags (high BP, abnormal values, dangerous drug combos)
- follow_up_mentioned: any follow-up timing mentioned

If nothing new for a field, return empty list/null.
Never duplicate what's in existing note.
""",
        response_model=SOAPDelta,
        system="""You are a clinical documentation assistant.
Extract only what is explicitly said. Never diagnose or infer.
Be conservative — missing data is better than incorrect data.
Vitals: extract exact values mentioned (e.g., "BP 128 over 82" → bp: "128/82")""",
        session_id=session_id,
        agent_name="scribe",
    )


def merge_soap(existing: SOAPNote, delta: SOAPDelta) -> SOAPNote:
    """Merge delta into existing note. Append-only — never overwrite."""
    if not delta:
        return existing

    # Subjective: append new complaints
    additions = [a for a in delta.subjective_additions if a not in existing.subjective]
    if additions:
        existing.subjective = (existing.subjective + "\n" + "\n".join(additions)).strip()

    # Objective: merge vitals (only update if not already set)
    obj = existing.objective.copy()
    for key, val in delta.objective_additions.items():
        if val and not obj.get(key):
            obj[key] = val
    existing.objective = obj

    # Assessment: update only if empty or new info
    if delta.assessment_update and not existing.assessment:
        existing.assessment = delta.assessment_update

    # Plan: append new items
    plan_items = [p for p in delta.plan_additions if p not in existing.plan]
    if plan_items:
        existing.plan = (existing.plan + "\n" + "\n".join(plan_items)).strip()

    # Tests: deduplicate
    existing.tests_ordered = list(set(
        existing.tests_ordered + delta.tests_mentioned
    ))

    # Medications: deduplicate
    existing.medications = list(set(
        existing.medications + delta.medications_mentioned
    ))

    # Follow-up
    if delta.follow_up_mentioned and not existing.follow_up_date:
        existing.follow_up_date = delta.follow_up_mentioned

    # Alerts: accumulate all
    existing.ai_alerts = list(set(
        existing.ai_alerts + delta.alerts
    ))

    return existing
```

---

## 3. ALERT DETECTOR

```python
# agents/scribe/alerts.py
"""
Detects clinical red flags in real-time transcript.
Fires alert to frontend immediately — don't wait for SOAP extraction.
Grounded in Knowledge MCP where possible.
"""
from pydantic import BaseModel
from agents.llm import call_llm
from agents.scribe.tools import retrieve_red_flags_for_context


class AlertResult(BaseModel):
    alerts: list[dict]   # [{message, severity, source}]
    # severity: info | warning | danger
    # source: "transcript" | "patient_history" | "drug_interaction"


# Deterministic red flag patterns (fast, no LLM needed)
INSTANT_RED_FLAGS = [
    ("chest pain", "danger",  "Cardiac symptom — consider urgent cardiology referral"),
    ("shortness of breath", "danger", "Respiratory/cardiac symptom — assess urgency"),
    ("jaw pain", "danger",   "Possible cardiac symptom alongside chest pain"),
    ("hba1c", "warning",     "HbA1c mentioned — check trend vs previous values"),
    ("blood pressure", "info", "BP discussed — note value in objective"),
    ("allergy", "warning",   "Allergy mentioned — cross-check with current medications"),
    ("suicidal", "danger",   "Mental health crisis indicator — escalate immediately"),
    ("can't breathe", "danger", "Acute respiratory distress — urgent assessment"),
]


async def detect_alerts(
    transcript_chunk: str,
    patient_history: dict,
    current_medications: list[str],
    session_id: str,
) -> list[dict]:
    """
    Two-pass alert detection:
    1. Instant: regex/keyword scan (no LLM latency)
    2. Contextual: LLM check for subtler patterns
    """
    alerts = []
    chunk_lower = transcript_chunk.lower()

    # Pass 1: instant keyword detection
    for keyword, severity, message in INSTANT_RED_FLAGS:
        if keyword in chunk_lower:
            alerts.append({
                "message": message,
                "severity": severity,
                "source": "transcript",
                "keyword": keyword,
            })

    # Pass 2: LLM contextual check (only if chunk is substantial)
    if len(transcript_chunk) > 100:
        contextual = await call_llm(
            prompt=f"""
Transcript segment: "{transcript_chunk}"

Patient history: {patient_history}
Current medications: {current_medications}

Identify any clinical alerts NOT already in this list: {[a["keyword"] for a in alerts]}

Look for:
- Drug interactions with current medications
- Values outside normal range (BP >140/90, glucose >200, etc.)
- Symptom patterns suggesting serious conditions
- Contradictions between what patient says and history

Return ONLY genuine alerts. Empty list if none.
Each alert: message (plain English for doctor), severity (info/warning/danger), source
""",
            response_model=AlertResult,
            system="Clinical alert detector. Flag only genuine concerns. No false positives.",
            session_id=session_id,
            agent_name="scribe_alerts",
        )
        if contextual:
            alerts.extend(contextual.alerts)

    return alerts
```

---

## 4. WEBSOCKET ENDPOINT

```python
# app/domains/clinical/ws.py
"""
WebSocket handler for live scribe session.
Receives audio chunks → transcribes → extracts SOAP → streams back.
State persisted in Redis — survives page refresh.
"""
import asyncio
import json
import uuid
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from agents.scribe.stt import transcribe_chunk, detect_speaker
from agents.scribe.extractor import (
    extract_soap_delta, merge_soap, SOAPNote
)
from agents.scribe.alerts import detect_alerts
from app.utils.redis import get_redis
from app.database import AsyncSessionLocal
from app.domains.clinical.models import ScribeSession


async def scribe_ws(websocket: WebSocket, appointment_id: str):
    await websocket.accept()

    redis = await get_redis()
    session_key = f"scribe:{appointment_id}"

    # Load or init session state
    existing = await redis.get(session_key)
    if existing:
        state = json.loads(existing)
        soap = SOAPNote(**state["soap"])
        full_transcript = state["transcript"]
        speaker_log = state["speaker_log"]
    else:
        soap = SOAPNote()
        full_transcript = ""
        speaker_log = []

    # Create DB scribe session record
    scribe_session_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        db.add(ScribeSession(
            id=scribe_session_id,
            appointment_id=appointment_id,
            started_at=datetime.utcnow(),
            status="active",
        ))
        await db.commit()

    print(f"[scribe_ws] Session started: {appointment_id}")

    try:
        while True:
            # Receive message from frontend
            raw = await websocket.receive()

            # Handle text control messages
            if "text" in raw:
                msg = json.loads(raw["text"])
                action = msg.get("action")

                if action == "end_session":
                    # Finalize + save
                    final = await _finalize_session(
                        appointment_id=appointment_id,
                        scribe_session_id=scribe_session_id,
                        soap=soap,
                        transcript=full_transcript,
                        speaker_log=speaker_log,
                    )
                    await websocket.send_json({"type": "session_ended", **final})
                    break

                elif action == "ping":
                    await websocket.send_json({"type": "pong"})

                elif action == "update_soap":
                    # Doctor manually edited SOAP — merge
                    edits = msg.get("soap", {})
                    for field, value in edits.items():
                        if hasattr(soap, field):
                            setattr(soap, field, value)
                    await _save_state(redis, session_key, soap, full_transcript, speaker_log)

            # Handle binary audio chunk
            elif "bytes" in raw:
                audio_bytes = raw["bytes"]

                # Skip tiny chunks (silence)
                if len(audio_bytes) < 1000:
                    continue

                # 1. Transcribe
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None,                           # thread pool
                        transcribe_chunk,
                        audio_bytes,
                    )
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Transcription failed: {e}",
                    })
                    continue

                chunk_text = result["text"].strip()
                if not chunk_text:
                    continue

                # 2. Speaker detection
                speaker = detect_speaker(chunk_text)
                timestamp = datetime.utcnow().isoformat()

                transcript_entry = {
                    "speaker": speaker,
                    "text": chunk_text,
                    "timestamp": timestamp,
                    "segments": result["segments"],
                }
                speaker_log.append(transcript_entry)
                full_transcript += f"\n{speaker.upper()}: {chunk_text}"

                # 3. Stream transcript to frontend immediately
                await websocket.send_json({
                    "type": "transcript",
                    "entry": transcript_entry,
                })

                # 4. SOAP extraction (async — don't block transcript stream)
                asyncio.create_task(
                    _extract_and_push(
                        websocket=websocket,
                        chunk_text=chunk_text,
                        soap=soap,
                        session_id=appointment_id,
                        redis=redis,
                        session_key=session_key,
                        speaker_log=speaker_log,
                        full_transcript=full_transcript,
                    )
                )

    except WebSocketDisconnect:
        print(f"[scribe_ws] Client disconnected: {appointment_id}")
        # Save state — doctor may reconnect
        await _save_state(redis, session_key, soap, full_transcript, speaker_log)

    except Exception as e:
        print(f"[scribe_ws] Error: {e}")
        await _save_state(redis, session_key, soap, full_transcript, speaker_log)


async def _extract_and_push(
    websocket: WebSocket,
    chunk_text: str,
    soap: SOAPNote,
    session_id: str,
    redis,
    session_key: str,
    speaker_log: list,
    full_transcript: str,
):
    """Runs in background task — SOAP extraction + alert detection."""
    try:
        # Extract SOAP delta
        delta = await extract_soap_delta(
            new_transcript=chunk_text,
            existing_note=soap,
            session_id=session_id,
        )

        if delta:
            updated_soap = merge_soap(soap, delta)

            # Push SOAP update to frontend
            await websocket.send_json({
                "type": "soap_update",
                "soap": updated_soap.model_dump(),
            })

            # Detect alerts
            alerts = await detect_alerts(
                transcript_chunk=chunk_text,
                patient_history={},     # TODO: pass from initial state
                current_medications=updated_soap.medications,
                session_id=session_id,
            )
            if alerts:
                await websocket.send_json({
                    "type": "alerts",
                    "alerts": alerts,
                })

            # Save to Redis
            await _save_state(
                redis, session_key, updated_soap, full_transcript, speaker_log
            )

    except Exception as e:
        print(f"[scribe_ws] SOAP extraction error: {e}")
        # Never crash the transcript stream due to SOAP failure


async def _save_state(redis, key: str, soap: SOAPNote, transcript: str, speaker_log: list):
    """Persist scribe state — survives page refresh."""
    await redis.setex(key, 60 * 60 * 4, json.dumps({
        "soap": soap.model_dump(),
        "transcript": transcript,
        "speaker_log": speaker_log,
        "saved_at": datetime.utcnow().isoformat(),
    }))


async def _finalize_session(
    appointment_id: str,
    scribe_session_id: str,
    soap: SOAPNote,
    transcript: str,
    speaker_log: list,
) -> dict:
    """Save final SOAP note + transcript to DB."""
    async with AsyncSessionLocal() as db:
        from app.domains.clinical.models import ClinicalNote, ScribeSession
        from sqlalchemy import select
        import uuid

        # Save clinical note
        note_id = str(uuid.uuid4())
        db.add(ClinicalNote(
            id=note_id,
            appointment_id=appointment_id,
            scribe_transcript=transcript,
            subjective=soap.subjective,
            objective=soap.objective,
            assessment=soap.assessment,
            plan=soap.plan,
            ai_alerts=soap.ai_alerts,
        ))

        # Update scribe session
        result = await db.execute(
            select(ScribeSession).where(ScribeSession.id == scribe_session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.transcript = transcript
            session.status = "completed"
            session.ended_at = datetime.utcnow()
            session.word_count = len(transcript.split())

        await db.commit()

    return {
        "note_id": note_id,
        "soap": soap.model_dump(),
        "transcript": transcript,
        "word_count": len(transcript.split()),
    }
```

---

## 5. FRONTEND — BROWSER RECORDING

```typescript
// src/features/clinical/hooks/useScribeSession.ts
import { useRef, useState, useCallback } from "react"

interface TranscriptEntry {
    speaker: "doctor" | "patient"
    text: string
    timestamp: string
}

interface SOAPNote {
    subjective: string
    objective: Record<string, string>
    assessment: string
    plan: string
    tests_ordered: string[]
    medications: string[]
    follow_up_date: string | null
    ai_alerts: Array<{ message: string; severity: string }>
}

export function useScribeSession(appointmentId: string) {
    const wsRef       = useRef<WebSocket | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript]   = useState<TranscriptEntry[]>([])
    const [soap, setSOAP]               = useState<SOAPNote>({
        subjective: "", objective: {}, assessment: "",
        plan: "", tests_ordered: [], medications: [],
        follow_up_date: null, ai_alerts: [],
    })
    const [alerts, setAlerts]     = useState<Array<{ message: string; severity: string }>>([])
    const [elapsedSec, setElapsed] = useState(0)
    const timerRef = useRef<NodeJS.Timeout>()

    const start = useCallback(async () => {
        // 1. Open WebSocket
        const ws = new WebSocket(
            `${process.env.NEXT_PUBLIC_WS_URL}/ws/scribe/${appointmentId}`
        )
        wsRef.current = ws

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
                case "transcript":
                    setTranscript(prev => [...prev, msg.entry])
                    break
                case "soap_update":
                    setSOAP(msg.soap)
                    break
                case "alerts":
                    setAlerts(prev => [...prev, ...msg.alerts])
                    break
                case "session_ended":
                    setSOAP(msg.soap)
                    setIsRecording(false)
                    break
            }
        }

        await new Promise<void>(resolve => {
            ws.onopen = () => resolve()
        })

        // 2. Start MediaRecorder
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,      // Whisper optimal sample rate
                echoCancellation: true,
                noiseSuppression: true,
            }
        })

        const recorder = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
        })
        recorderRef.current = recorder

        // Send 30s chunks
        recorder.ondataavailable = async (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(await e.data.arrayBuffer())
            }
        }

        recorder.start(30_000)          // chunk every 30 seconds
        setIsRecording(true)

        // Timer
        timerRef.current = setInterval(() => {
            setElapsed(s => s + 1)
        }, 1000)

    }, [appointmentId])


    const stop = useCallback(async () => {
        recorderRef.current?.stop()
        recorderRef.current?.stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "end_session" }))
        }
    }, [])


    const updateSOAP = useCallback((field: keyof SOAPNote, value: unknown) => {
        setSOAP(prev => ({ ...prev, [field]: value }))
        // Sync edit to backend
        wsRef.current?.send(JSON.stringify({
            action: "update_soap",
            soap: { [field]: value },
        }))
    }, [])


    return {
        isRecording, transcript, soap, alerts,
        elapsedSec, start, stop, updateSOAP,
    }
}
```

```typescript
// src/features/clinical/components/LiveTranscript.tsx
"use client"
import { useEffect, useRef } from "react"

interface Entry {
    speaker: "doctor" | "patient"
    text: string
    timestamp: string
}

export function LiveTranscript({ entries }: { entries: Entry[] }) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [entries])

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto p-4">
            {entries.map((entry, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-['IBM_Plex_Sans'] uppercase
                                     tracking-[0.1em] text-[var(--text-tertiary)]">
                        {entry.speaker === "doctor" ? "Dr. Sharma" : "Patient"}
                        {" · "}
                        {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit", second: "2-digit"
                        })}
                    </span>
                    <p className="text-[14px] leading-[22px] font-['IBM_Plex_Sans']
                                  text-[var(--text-primary)]">
                        {entry.text}
                    </p>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    )
}
```

```typescript
// src/features/clinical/components/SOAPNoteEditor.tsx
"use client"
import { SOAPNote } from "@/features/clinical/hooks/useScribeSession"

interface Props {
    soap: SOAPNote
    onUpdate: (field: keyof SOAPNote, value: unknown) => void
}

export function SOAPNoteEditor({ soap, onUpdate }: Props) {
    return (
        <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto">

            {/* Alerts */}
            {soap.ai_alerts.length > 0 && (
                <div className="flex flex-col gap-2">
                    {soap.ai_alerts.map((alert, i) => (
                        <div key={i}
                             className={`px-3 py-2 rounded-[4px] border-l-2 text-[13px]
                                         font-['IBM_Plex_Sans'] ${
                                alert.severity === "danger"
                                    ? "border-[var(--status-danger)] bg-[#EF444408] text-[var(--status-danger)]"
                                    : "border-[var(--status-warning)] bg-[#EAB30808] text-[var(--status-warning)]"
                            }`}>
                            ⚠ {alert.message}
                        </div>
                    ))}
                </div>
            )}

            {/* S */}
            <SOAPSection
                label="SUBJECTIVE"
                value={soap.subjective}
                onChange={v => onUpdate("subjective", v)}
                placeholder="Chief complaint, patient-reported symptoms..."
            />

            {/* O */}
            <div className="flex flex-col gap-2">
                <SectionLabel>OBJECTIVE</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                    {["bp","weight","heart_rate","temperature","spo2"].map(key => (
                        <div key={key} className="flex flex-col gap-1">
                            <span className="text-[11px] text-[var(--text-tertiary)]
                                             font-['IBM_Plex_Sans'] uppercase tracking-[0.08em]">
                                {key.replace("_"," ")}
                            </span>
                            <input
                                value={(soap.objective as Record<string,string>)[key] || ""}
                                onChange={e => onUpdate("objective", {
                                    ...soap.objective, [key]: e.target.value
                                })}
                                className="bg-[var(--bg-elevated)] border border-[var(--border-base)]
                                           rounded-[4px] px-2 py-1.5 text-[13px]
                                           font-['IBM_Plex_Mono'] text-[var(--text-primary)]
                                           outline-none focus:border-[var(--accent)]"
                                placeholder={key === "bp" ? "128/82" : "—"}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* A */}
            <SOAPSection
                label="ASSESSMENT"
                value={soap.assessment}
                onChange={v => onUpdate("assessment", v)}
                placeholder="Diagnosis or clinical impression..."
            />

            {/* P */}
            <SOAPSection
                label="PLAN"
                value={soap.plan}
                onChange={v => onUpdate("plan", v)}
                placeholder="Treatment plan, referrals, lifestyle advice..."
            />

            {/* Tests */}
            {soap.tests_ordered.length > 0 && (
                <div>
                    <SectionLabel>TESTS ORDERED</SectionLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {soap.tests_ordered.map((t, i) => (
                            <span key={i}
                                  className="px-2 py-1 bg-[var(--bg-elevated)]
                                             border border-[var(--border-dim)]
                                             rounded-[4px] text-[12px]
                                             text-[var(--text-secondary)]
                                             font-['IBM_Plex_Sans']">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function SOAPSection({
    label, value, onChange, placeholder,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
}) {
    return (
        <div className="flex flex-col gap-2">
            <SectionLabel>{label}</SectionLabel>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="bg-[var(--bg-elevated)] border border-[var(--border-base)]
                           rounded-[6px] px-3 py-2 text-[14px] leading-[22px]
                           font-['IBM_Plex_Sans'] text-[var(--text-primary)]
                           placeholder:text-[var(--text-tertiary)]
                           outline-none focus:border-[var(--accent)]
                           resize-none transition-colors duration-100"
            />
        </div>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[11px] font-['IBM_Plex_Sans'] font-[400]
                         uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            {children}
        </span>
    )
}
```

---

## 6. WEBSOCKET ROUTE REGISTRATION

```python
# app/main.py (add to existing)
from app.domains.clinical.ws import scribe_ws

@app.websocket("/ws/scribe/{appointment_id}")
async def scribe_websocket(websocket: WebSocket, appointment_id: str):
    await scribe_ws(websocket, appointment_id)
```

---

## INSTALL

```bash
pip install faster-whisper openai-whisper pydantic httpx \
  websockets --break-system-packages

# Download Whisper model on first run (cached ~/.cache/huggingface)
python -c "from faster_whisper import WhisperModel; WhisperModel('medium', device='cpu', compute_type='int8')"
```

---

## RULES

```
1. Whisper runs in thread pool executor — never blocks async event loop
2. SOAP extraction async task — never blocks transcript stream
3. Redis saves state every chunk — survives page refresh
4. end_session message → finalize → save to DB — explicit close required
5. Audio chunk min 1000 bytes — skip smaller (silence/noise)
6. MediaRecorder 30s chunks — balance between latency and context
7. Speaker detection heuristic only — no pyannote (too heavy for MVP)
8. Alerts stream immediately — don't wait for SOAP extraction
9. Doctor edits via update_soap — merge not overwrite
10. Scribe crashes never propagate to appointment — catch all exceptions
```
