import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AppLanguage } from '../types/forensics';

interface CameraCaptureModalProps {
  lang: AppLanguage;
  onCapture: (base64Data: string, mimeType: string, previewUrl: string) => void;
  onClose: () => void;
}

export function CameraCaptureModal({ lang, onCapture, onClose }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(
        lang === 'hi'
          ? 'कैमरा नहीं खुला। नीचे से फोटो चुनें।'
          : 'Camera unavailable. Upload a photo below.'
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    stopCamera();
    onCapture(base64, 'image/jpeg', dataUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        stopCamera();
        onCapture(base64, file.type || 'image/jpeg', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hi' ? 'फोटो लें' : 'Take Photo'}
    >
      <div className="card-elevated w-full max-w-lg max-h-[92dvh] flex flex-col rounded-lg overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-5 h-5 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold truncate">
              {lang === 'hi' ? 'फोटो खींचें' : 'Take Photo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 bg-white overflow-y-auto">
          {cameraError ? (
            <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-4 text-sm text-[#92400E] flex flex-wrap items-center justify-between gap-3">
              <span>{cameraError}</span>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#D97706] text-xs font-semibold text-[#92400E]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === 'hi' ? 'पुनः प्रयास' : 'Retry'}
              </button>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-[#0F172A] aspect-video flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  {lang === 'hi' ? 'कैमरा खुल रहा है…' : 'Opening camera…'}
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col sm:flex-row gap-2.5">
            {cameraReady && (
              <button
                type="button"
                onClick={handleSnap}
                className="flex-1 min-h-[48px] px-5 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm sm:text-base font-bold hover:bg-[#1E293B] inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 shrink-0" />
                {lang === 'hi' ? 'फोटो खींचें' : 'Capture'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-h-[48px] px-5 py-2.5 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-sm sm:text-base font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 shrink-0" />
              {lang === 'hi' ? 'गैलरी से चुनें' : 'Upload Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
