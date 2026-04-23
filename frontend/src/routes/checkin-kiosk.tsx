/**
 * QR Kiosk Check-in page.
 * Full-screen mode for a tablet/monitor at gym entrance.
 * Scans QR → identifies student → admin selects class → confirms check-in.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { useCheckinWithAttendance, useStudent } from "@/hooks/useStudents";
import { useActiveMembership } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { useClasses } from "@/hooks/useClasses";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  ArrowLeft,
  QrCode,
  CalendarCheck,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";

export const Route = createFileRoute("/checkin-kiosk")({
  component: KioskPage,
});

type ScanState = "scanning" | "found";

// ─── Student panel with class selector ────────────────────────────────────────

function StudentPanel({
  studentId,
  onReset,
}: {
  studentId: string;
  onReset: () => void;
}): React.JSX.Element {
  const { data: student, isLoading: studentLoading } = useStudent(studentId);
  const { data: activeMembership } = useActiveMembership(studentId);
  const { data: reservationsData, isLoading: reservationsLoading } =
    useReservationsForStudent(studentId);
  const { data: classesData } = useClasses({ limit: 200 });
  const { mutate: doCheckin, isPending, isSuccess, isError } = useCheckinWithAttendance();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayReservations = (reservationsData?.items ?? []).filter(
    (r) => r.class_date === today && (r.status === "confirmed" || r.status === "waitlisted")
  );

  const classMap = Object.fromEntries(
    (classesData?.items ?? []).map((c) => [
      c.class_id,
      {
        type: CLASS_TYPE_LABELS[c.class_type as keyof typeof CLASS_TYPE_LABELS] ?? c.class_type,
        time: c.start_time.slice(0, 5),
        location: c.location,
      },
    ])
  );

  // Auto-select if only one class today
  useEffect(() => {
    if (todayReservations.length === 1 && !selectedClassId) {
      setSelectedClassId(todayReservations[0].class_id ?? null);
    }
  }, [todayReservations, selectedClassId]);

  // Auto-reset 5 s after result
  useEffect(() => {
    if (confirmed && (isSuccess || isError)) {
      const t = setTimeout(onReset, 5000);
      return () => clearTimeout(t);
    }
  }, [confirmed, isSuccess, isError, onReset]);

  const isActive = student ? student.status === "active" : false;
  const hasActiveMembership = activeMembership?.status === "active";
  const daysUntilExpiry = activeMembership?.days_until_expiry ?? 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const canEnter = isActive && hasActiveMembership && daysUntilExpiry > 0;
  const hasClassToday = todayReservations.length > 0;

  const handleConfirm = () => {
    if (!selectedClassId) return;
    setConfirmed(true);
    doCheckin({ studentId, classId: selectedClassId });
  };

  // ── Loading ──
  if (studentLoading) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
        <p className="text-xl text-[--tx-muted]">Verificando...</p>
      </div>
    );
  }

  // ── Student not found ──
  if (!student) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <XCircle className="h-20 w-20 text-[--color-danger]" />
        <p className="text-2xl font-bold text-[--color-danger]">Código no reconocido</p>
        <p className="text-[--tx-muted]">No se encontró ningún miembro con este QR.</p>
        <button
          onClick={onReset}
          className="mt-2 rounded-xl border border-[--bd-default] px-6 py-3 text-[--tx-muted] hover:text-[--tx-primary]"
        >
          Escanear otro código
        </button>
      </div>
    );
  }

  // ── Result screen (after confirm) ──
  if (confirmed && (isSuccess || isError)) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Avatar */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-bold shadow-xl"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
            color: "var(--gold-fg)",
          }}
        >
          {getInitials(student.full_name)}
        </div>
        <p className="text-2xl font-bold text-[--tx-primary]">{student.full_name}</p>

        {isSuccess && canEnter ? (
          <>
            <div className="rounded-3xl border-4 border-[--color-success-bd] bg-[--color-success-bg] p-6">
              <CheckCircle2 className="h-16 w-16 text-[--color-success]" />
            </div>
            <p className="text-3xl font-bold text-[--color-success]">Acceso Permitido</p>
            {selectedClassId && classMap[selectedClassId] && (
              <p className="text-[--tx-muted]">
                {classMap[selectedClassId].type} · {classMap[selectedClassId].time}
              </p>
            )}
            {activeMembership && isExpiringSoon && (
              <p className="text-sm text-[--color-warning]">
                ⚠️ Membresía vence en {daysUntilExpiry} días
              </p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-3xl border-4 border-[--color-danger-bd] bg-[--color-danger-bg] p-6">
              <XCircle className="h-16 w-16 text-[--color-danger]" />
            </div>
            <p className="text-3xl font-bold text-[--color-danger]">Acceso Denegado</p>
            <p className="text-[--tx-muted]">
              {!isActive ? "Alumno inactivo" : "Sin membresía activa"}
            </p>
          </>
        )}

        <p className="text-xs text-[--tx-disabled]">Regresando al escáner en 5 segundos...</p>
        <button
          onClick={onReset}
          className="rounded-xl border border-[--bd-default] px-6 py-2.5 text-sm text-[--tx-muted] hover:text-[--tx-primary]"
        >
          Escanear ahora
        </button>
      </div>
    );
  }

  // ── Class selection screen ──
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* Avatar + name */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-bold shadow-xl"
        style={{
          background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
          color: "var(--gold-fg)",
        }}
      >
        {getInitials(student.full_name)}
      </div>
      <div>
        <p className="text-2xl font-bold text-[--tx-primary]">{student.full_name}</p>
        {activeMembership && (
          <p className="mt-1 text-sm text-[--tx-muted]">
            {MEMBERSHIP_TYPE_LABELS[
              activeMembership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS
            ] ?? activeMembership.membership_type}
            {isExpiringSoon && (
              <span className="ml-2 text-[--color-warning]">
                · Vence en {daysUntilExpiry} días
              </span>
            )}
          </p>
        )}
      </div>

      {/* Access denied early exit */}
      {!canEnter && (
        <div className="w-full rounded-2xl border-2 border-[--color-danger-bd] bg-[--color-danger-bg] p-5">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-[--color-danger]" />
          <p className="text-xl font-bold text-[--color-danger]">Acceso Denegado</p>
          <p className="mt-1 text-sm text-[--tx-muted]">
            {!isActive ? "Alumno inactivo" : "Sin membresía activa o membresía vencida"}
          </p>
          <button
            onClick={onReset}
            className="mt-4 rounded-xl border border-[--bd-default] px-6 py-2.5 text-sm text-[--tx-muted] hover:text-[--tx-primary]"
          >
            Escanear otro código
          </button>
        </div>
      )}

      {/* Class selection */}
      {canEnter && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[--gold]" />
            <p className="text-sm font-semibold text-[--tx-muted]">
              Selecciona la clase de hoy
            </p>
          </div>

          {reservationsLoading ? (
            <p className="text-sm text-[--tx-disabled]">Cargando clases...</p>
          ) : !hasClassToday ? (
            <div className="rounded-2xl border-2 border-[--color-warning-bd] bg-[--color-warning-bg] p-5">
              <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-[--color-warning]" />
              <p className="font-semibold text-[--color-warning]">Sin clases programadas hoy</p>
              <p className="mt-1 text-sm text-[--tx-muted]">
                No se encontraron reservaciones para hoy. Contacta a recepción.
              </p>
              <button
                onClick={onReset}
                className="mt-4 rounded-xl border border-[--bd-default] px-6 py-2.5 text-sm text-[--tx-muted] hover:text-[--tx-primary]"
              >
                Escanear otro código
              </button>
            </div>
          ) : (
            <>
              {/* Class cards — large touch targets */}
              <div className="space-y-2">
                {todayReservations.map((r) => {
                  const cls = classMap[r.class_id ?? ""];
                  const isSelected = selectedClassId === r.class_id;
                  return (
                    <button
                      key={r.class_id}
                      onClick={() => setSelectedClassId(r.class_id ?? null)}
                      className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                        isSelected
                          ? "border-[--gold] bg-[--gold-bg]"
                          : "border-[--bd-subtle] bg-[--bg-muted] hover:border-[--gold-bd]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-lg font-bold ${
                              isSelected ? "text-[--gold]" : "text-[--tx-primary]"
                            }`}
                          >
                            {cls ? cls.type : r.class_id}
                          </p>
                          {cls && (
                            <p className="text-sm text-[--tx-muted]">
                              {cls.time} · {cls.location}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              r.status === "confirmed"
                                ? "bg-[--color-success-bg] text-[--color-success]"
                                : "bg-[--color-warning-bg] text-[--color-warning]"
                            }`}
                          >
                            {r.status === "confirmed" ? "Confirmada" : "En espera"}
                          </span>
                          {isSelected && (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full"
                              style={{ background: "var(--gold)", color: "var(--gold-fg)" }}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!selectedClassId || isPending}
                className="mt-2 w-full rounded-2xl py-5 text-xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: selectedClassId
                    ? "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"
                    : "var(--bg-muted)",
                  color: selectedClassId ? "var(--gold-fg)" : "var(--tx-disabled)",
                }}
              >
                {isPending ? "Registrando..." : "✓ Confirmar Check-in"}
              </button>

              <button
                onClick={onReset}
                className="w-full rounded-xl border border-[--bd-default] py-2.5 text-sm text-[--tx-muted] hover:text-[--tx-primary]"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Kiosk page ───────────────────────────────────────────────────────────────

function KioskPage(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanning = useCallback(() => {
    cancelAnimationFrame(animRef.current);
  }, []);

  const reset = useCallback(() => {
    setScannedId(null);
    setScanState("scanning");
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      stopScanning();
      setScanState("found");
      setScannedId(code.data);
      return;
    }
    animRef.current = requestAnimationFrame(tick);
  }, [stopScanning]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
          animRef.current = requestAnimationFrame(tick);
        }
      })
      .catch(() => setCameraError("No se pudo acceder a la cámara. Verifica los permisos."));

    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [tick]);

  // Restart scanning loop when state resets
  useEffect(() => {
    if (scanState === "scanning" && videoRef.current) {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        const video = videoRef.current;
        const onLoadedData = () => {
          animRef.current = requestAnimationFrame(tick);
          video.removeEventListener("loadeddata", onLoadedData);
        };
        video.addEventListener("loadeddata", onLoadedData);
        return () => video.removeEventListener("loadeddata", onLoadedData);
      }
    }
  }, [scanState, tick]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[--bg-base]">
      {/* Back link */}
      <Link
        to="/checkin"
        className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:text-[--tx-primary]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">Check-in QR</h1>
          <p className="mt-1 text-[--tx-muted]">
            {scanState === "scanning"
              ? "Acerca tu código QR a la cámara"
              : "Selecciona tu clase de hoy"}
          </p>
        </div>

        {/* Camera / result area */}
        <div className="rounded-3xl border border-[--bd-default] bg-[--bg-surface] p-8">
          {cameraError ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-16 w-16 text-[--color-warning]" />
              <p className="text-[--color-warning]">{cameraError}</p>
              <Link
                to="/checkin"
                className="mt-2 text-sm text-[--gold] hover:text-[--gold-hover]"
              >
                Ir al check-in manual →
              </Link>
            </div>
          ) : scanState === "scanning" ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative overflow-hidden rounded-2xl">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-64 w-full rounded-2xl object-cover"
                />
                {/* Scan frame overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-40 w-40 rounded-2xl"
                    style={{
                      border: "3px solid var(--gold)",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex items-center gap-2 text-sm text-[--tx-muted]">
                <Camera className="h-4 w-4" />
                Escaneando...
              </div>
            </div>
          ) : scannedId ? (
            <StudentPanel
              key={scannedId}
              studentId={scannedId}
              onReset={reset}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
