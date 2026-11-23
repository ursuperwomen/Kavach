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
        throw new Error('Camera API not available in this browser.');
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
          ? 'कैमरा नहीं खुल सका। आप नीचे "गैलरी से फोटो चुनें" बटन से स्क्रीनशॉट या फोटो अपलोड कर सकते हैं।'
          : 'Camera permission unavailable. You can still upload any screenshot or photo directly below.'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hi' ? 'कैमरा से लिंक या मैसेज की फोटो लें' : 'Scan link or message photo'}
    >
      <div className="card-elevated w-full max-w-xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5" />
            <h2 className="text-[18px] font-bold">
              {lang === 'hi' ? 'लिंक, स्क्रीनशॉट या QR की फोटो खींचें' : 'Snap a Photo of Any Link or Message'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white">
          {cameraError ? (
            <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-5 text-[16px] text-[#92400E] space-y-3">
              <p>{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#D97706] text-sm font-semibold text-[#92400E]"
              >
                <RefreshCw className="w-4 h-4" />
                {lang === 'hi' ? 'फिर से कैमरा खोलें' : 'Retry Camera'}
              </button>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-[#0F172A] aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  {lang === 'hi' ? 'कैमरा शुरू हो रहा है…' : 'Starting camera…'}
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

          <div className="flex flex-col sm:flex-row gap-3">
            {cameraReady && (
              <button
                type="button"
                onClick={handleSnap}
                className="flex-1 min-h-[56px] px-6 py-3 rounded-lg bg-[#0F172A] text-white text-[17px] font-bold hover:bg-[#1E293B] inline-flex items-center justify-center gap-2.5"
              >
                <Camera className="w-5 h-5" />
                {lang === 'hi' ? 'फोटो खींचें और जांचें' : 'Capture & Check Now'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-h-[56px] px-6 py-3 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-[16px] font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-2.5"
            >
              <Upload className="w-5 h-5" />
              {lang === 'hi' ? 'गैलरी से फोटो चुनें' : 'Choose Photo from Device'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
