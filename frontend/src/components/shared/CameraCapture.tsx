/** Camera capture component for taking profile photos.
 *
 * Uses the browser's getUserMedia API to access the device camera.
 * Returns a base64-encoded JPEG via the onCapture callback.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  currentPhoto?: string | null;
}

export function CameraCapture({
  onCapture,
  onClose,
  currentPhoto,
}: CameraCaptureProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCaptured(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function takePhoto(): void {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crop center square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stopStream();
  }

  function retake(): void {
    setCaptured(null);
    startCamera();
  }

  function confirm(): void {
    if (captured) {
      onCapture(captured);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--tx-primary]">Foto de perfil</h3>
        <button
          type="button"
          onClick={() => { stopStream(); onClose(); }}
          className="rounded-lg p-1.5 text-[--tx-disabled] hover:bg-[--bg-muted] hover:text-[--tx-primary] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-[--color-danger-bd] bg-[--color-danger-bg] p-3 text-sm text-[--color-danger]">
          {error}
        </div>
      )}

      {/* Camera / Preview */}
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-[--bd-subtle] bg-black">
        {captured ? (
          <img src={captured} alt="Captura" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        {!captured && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-[70%] w-[70%] rounded-full border-2 border-white/30" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Current photo preview */}
      {currentPhoto && !captured && !stream && (
        <div className="flex items-center gap-3">
          <img
            src={currentPhoto}
            alt="Foto actual"
            className="h-12 w-12 rounded-full object-cover border border-[--bd-subtle]"
          />
          <span className="text-xs text-[--tx-muted]">Foto actual</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        {captured ? (
          <>
            <button
              type="button"
              onClick={retake}
              className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--bd-default] hover:text-[--tx-primary]"
            >
              <RotateCcw className="h-4 w-4" />
              Retomar
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              <Camera className="h-4 w-4" />
              Usar foto
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={takePhoto}
            disabled={!!error}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
            }}
          >
            <Camera className="h-5 w-5" />
            Tomar foto
          </button>
        )}
      </div>
    </div>
  );
}
