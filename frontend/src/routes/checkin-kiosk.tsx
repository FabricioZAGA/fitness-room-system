/**
 * QR Kiosk Check-in page.
 * Full-screen mode for a tablet/monitor at gym entrance.
 * Uses the device camera to scan QR codes and performs check-in automatically.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { useCheckin, useStudent } from "@/hooks/useStudents";
import { useActiveMembership } from "@/hooks/useMemberships";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  ArrowLeft,
  QrCode,
} from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";

export const Route = createFileRoute("/checkin-kiosk")({
  component: KioskPage,
});

type ScanState = "scanning" | "found" | "processing" | "success" | "denied" | "error";

// ─── Student check result panel ───────────────────────────────────────────────

function StudentPanel({
  studentId,
  onReset,
}: {
  studentId: string;
  onReset: () => void;
}): React.JSX.Element {
  const { data: student, isLoading: studentLoading } = useStudent(studentId);
  const { data: activeMembership } = useActiveMembership(studentId);
  const { mutate: checkin, isPending, isSuccess, isError } = useCheckin();

  useEffect(() => {
    if (student) {
      checkin(studentId);
    }
  }, [student, studentId, checkin]);

  // Auto-reset after 5 seconds
  useEffect(() => {
    if (isSuccess || isError) {
      const t = setTimeout(onReset, 5000);
      return () => clearTimeout(t);
    }
  }, [isSuccess, isError, onReset]);

  if (studentLoading || isPending) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
        <p className="text-xl text-[--tx-muted]">Verificando acceso...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center gap-6">
        <XCircle className="h-20 w-20 text-[--color-danger]" />
        <p className="text-2xl font-bold text-[--color-danger]">Código no reconocido</p>
        <button onClick={onReset} className="mt-4 rounded-xl border border-[--bd-default] px-6 py-3 text-[--tx-muted] hover:text-[--tx-primary]">
          Escanear otro código
        </button>
      </div>
    );
  }

  const isActive = student.status === "active" || student.status === "founder";
  const hasActiveMembership = activeMembership?.status === "active";
  const canEnter = isActive && hasActiveMembership;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Avatar */}
      <div
        className="flex h-24 w-24 items-center justify-center rounded-3xl text-3xl font-bold shadow-2xl"
        style={{
          background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
          color: "var(--gold-fg)",
        }}
      >
        {getInitials(student.full_name)}
      </div>

      <div>
        <p className="text-3xl font-bold text-[--tx-primary]">{student.full_name}</p>
        {activeMembership && (
          <p className="mt-1 text-base text-[--tx-muted]">
            {MEMBERSHIP_TYPE_LABELS[activeMembership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
            {activeMembership.days_until_expiry !== null && activeMembership.days_until_expiry <= 7 && (
              <span className="ml-2 text-[--color-warning]">
                · Vence en {activeMembership.days_until_expiry} días
              </span>
            )}
          </p>
        )}
      </div>

      {/* Access decision */}
      {isSuccess && canEnter && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-3xl border-4 border-[--color-success-bd] bg-[--color-success-bg] p-6">
            <CheckCircle2 className="h-20 w-20 text-[--color-success]" />
          </div>
          <p className="text-3xl font-bold text-[--color-success]">Acceso Permitido</p>
          {activeMembership && (
            <p className="text-sm text-[--tx-muted]">Vence: {formatDate(activeMembership.end_date)}</p>
          )}
        </div>
      )}
      {(isError || (isSuccess && !canEnter)) && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-3xl border-4 border-[--color-danger-bd] bg-[--color-danger-bg] p-6">
            <XCircle className="h-20 w-20 text-[--color-danger]" />
          </div>
          <p className="text-3xl font-bold text-[--color-danger]">Acceso Denegado</p>
          <p className="text-sm text-[--tx-muted]">
            {!isActive ? "Alumno inactivo" : "Sin membresía activa"}
          </p>
        </div>
      )}

      <p className="text-xs text-[--tx-disabled]">Regresando al escáner en 5 segundos...</p>
      <button onClick={onReset} className="rounded-xl border border-[--bd-default] px-6 py-2.5 text-sm text-[--tx-muted] hover:text-[--tx-primary]">
        Escanear ahora
      </button>
    </div>
  );
}

// ─── Kiosk Page ───────────────────────────────────────────────────────────────

function KioskPage(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
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
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
          animRef.current = requestAnimationFrame(tick);
        }
      })
      .catch(() => setCameraError("No se pudo acceder a la cámara. Verifica los permisos."));

    return () => {
      cancelAnimationFrame(animRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [tick]);

  // Restart scanning when state resets
  useEffect(() => {
    if (scanState === "scanning" && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
    }
  }, [scanState, tick]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[--bg-base]">
      {/* Back link */}
      <Link
        to="/checkin"
        className="absolute left-5 top-5 flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-surface] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:text-[--tx-primary] z-10"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)", color: "var(--gold-fg)" }}>
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-[--tx-primary]">Check-in QR</h1>
          <p className="mt-1 text-[--tx-muted]">Acerca tu código QR a la cámara</p>
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
          ) : (scanState === "scanning") ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative overflow-hidden rounded-2xl">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-64 w-full rounded-2xl object-cover"
                />
                {/* QR scan frame overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-2xl"
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
            <StudentPanel studentId={scannedId} onReset={reset} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
