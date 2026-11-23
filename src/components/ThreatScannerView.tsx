import {
  AlertCircle,
  Camera,
  ChevronDown,
  ChevronUp,
  FileArchive,
  Flame,
  Image as ImageIcon,
  Loader2,
  Mic,
  Newspaper,
  Share2,
  ShieldCheck,
  Smartphone,
  Square,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { R4C_SAMPLE_PRESETS } from '../data/samples';
import { TRENDING_SCAM_NEWS, UI_COPY } from '../data/translations';
import type {
  AppLanguage,
  CaseRecord,
  HeatListItem,
  SampleCasePreset,
} from '../types/forensics';
import { createSafeTestApkFile, inspectApkArchive, type ParsedApkSummary } from '../utils/apkInspector';
import { AnalysisResultPanel } from './AnalysisResultPanel';
import { CameraCaptureModal } from './CameraCaptureModal';
import { RiskBadge } from './RiskBadge';

interface ThreatScannerViewProps {
  lang: AppLanguage;
  heatItems: HeatListItem[];
  isInvestigator?: boolean;
  authToken?: string | null;
  latestResult: CaseRecord | null;
  onCaseCreated: (record: CaseRecord) => void;
  onCaseUpdated: (record: CaseRecord) => void;
  onInspectUrl: (url: string, record: CaseRecord) => void;
  onOpenTrendingTab: () => void;
  onOpenEmergency: () => void;
}

const APK_PERMISSION_OPTIONS = [
  { id: 'android.permission.READ_CONTACTS', label: 'READ_CONTACTS' },
  { id: 'android.permission.READ_SMS', label: 'READ_SMS' },
  { id: 'android.permission.RECEIVE_SMS', label: 'RECEIVE_SMS' },
  { id: 'android.permission.READ_CALL_LOG', label: 'READ_CALL_LOG' },
  { id: 'android.permission.CAMERA', label: 'CAMERA' },
  { id: 'android.permission.SYSTEM_ALERT_WINDOW', label: 'OVERLAY' },
];

export function ThreatScannerView({
  lang,
  heatItems,
  isInvestigator = false,
  authToken = null,
  latestResult,
  onCaseCreated,
  onCaseUpdated,
  onInspectUrl,
  onOpenTrendingTab,
  onOpenEmergency,
}: ThreatScannerViewProps) {
  const t = UI_COPY[lang];

  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [scannedPhotoPreview, setScannedPhotoPreview] = useState<string | null>(null);
  const [photoVisualClues, setPhotoVisualClues] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioFileRef = useRef<HTMLInputElement | null>(null);

  const [showApkTools, setShowApkTools] = useState(false);
  const [apkAppName, setApkAppName] = useState('');
  const [apkPackageName, setApkPackageName] = useState('');
  const [apkPermissions, setApkPermissions] = useState<string[]>([
    'android.permission.READ_CONTACTS',
    'android.permission.READ_SMS',
    'android.permission.CAMERA',
  ]);
  const [parsedApk, setParsedApk] = useState<ParsedApkSummary | null>(null);
  const apkFileInputRef = useRef<HTMLInputElement | null>(null);

  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToResult = () => {
    setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const analyzeTextOrLink = async (
    textToCheck: string,
    explicitUrl?: string,
    apkMeta?: SampleCasePreset['apkMetadata']
  ) => {
    const trimmed = textToCheck.trim();
    if (!trimmed && !explicitUrl && !apkMeta) {
      setErrorMessage(lang === 'hi' ? 'लिंक या मैसेज पेस्ट करें।' : 'Paste a link or message first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusNote(lang === 'hi' ? 'जांच जारी है…' : 'Scanning…');
    setScannedPhotoPreview(null);
    setPhotoVisualClues(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: trimmed,
          url: explicitUrl,
          lang,
          channel: /^https?:\/\//i.test(trimmed) ? 'Web Browser' : 'WhatsApp',
          submittedBy: authToken ? undefined : 'Kavach Quick Check',
          apkMetadata: apkMeta,
          saveToLedger: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      onCaseCreated(data.caseRecord as CaseRecord);
      scrollToResult();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to check.');
    } finally {
      setIsAnalyzing(false);
      setStatusNote(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const apkMeta =
      showApkTools && (apkPackageName.trim() || apkAppName.trim() || parsedApk)
        ? {
            appName: apkAppName.trim() || parsedApk?.fileName || 'Android App',
            packageName: apkPackageName.trim() || parsedApk?.detectedPackageName,
            source: 'Direct APK / Unverified Link',
            permissions: apkPermissions,
            embeddedStrings: parsedApk?.embeddedStrings,
            fileSizeKb: parsedApk?.fileSizeKb,
            archiveEntriesCount: parsedApk?.archiveEntriesCount,
          }
        : undefined;
    await analyzeTextOrLink(inputText, undefined, apkMeta);
  };

  const analyzeImageBase64 = async (base64Data: string, mimeType: string, previewUrl: string) => {
    setShowCameraModal(false);
    setScannedPhotoPreview(previewUrl);
    setPhotoVisualClues(null);
    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusNote(lang === 'hi' ? 'फोटो स्कैन हो रही है…' : 'Scanning photo…');

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          lang,
          saveToLedger: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Photo scan failed.');
      if (data.extractedText) setInputText(data.extractedText);
      if (data.visualClues) setPhotoVisualClues(data.visualClues);
      onCaseCreated(data.caseRecord as CaseRecord);
      scrollToResult();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Photo scan failed.');
    } finally {
      setIsAnalyzing(false);
      setStatusNote(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64 = dataUrl.split(',')[1];
      if (base64) analyzeImageBase64(base64, file.type || 'image/jpeg', dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submitAudioBlob = async (blob: Blob, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setVoiceTranscript(null);
    setStatusNote(lang === 'hi' ? 'ऑडियो जांच जारी है…' : 'Analyzing audio…');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(new Error('Audio read failed.'));
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          lang,
          autoAnalyze: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice check failed.');
      if (data.transcript) {
        setVoiceTranscript(data.transcript);
        setInputText(data.transcript);
      }
      if (data.caseRecord) {
        onCaseCreated(data.caseRecord as CaseRecord);
        scrollToResult();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Voice check failed.');
    } finally {
      setIsAnalyzing(false);
      setStatusNote(null);
    }
  };

  const toggleVoiceRecording = async () => {
    setErrorMessage(null);
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(lang === 'hi' ? 'माइक उपलब्ध नहीं है।' : 'Microphone unavailable.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        if (audioBlob.size > 0) submitAudioBlob(audioBlob, mime);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : lang === 'hi'
          ? 'माइक की अनुमति नहीं मिली।'
          : 'Microphone denied.'
      );
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    submitAudioBlob(file, file.type || 'audio/mp3');
    e.target.value = '';
  };

  const handleApkFile = async (file: File) => {
    try {
      const summary = await inspectApkArchive(file);
      setParsedApk(summary);
      setApkAppName(file.name.replace(/\.(apk|zip)$/i, '').replace(/[_-]+/g, ' '));
      if (summary.detectedPackageName) setApkPackageName(summary.detectedPackageName);
      if (summary.detectedPermissions.length > 0) setApkPermissions(summary.detectedPermissions);
      if (summary.embeddedStrings.length > 0) {
        setInputText(`APK: ${file.name}\n${summary.embeddedStrings.join('\n')}`);
      }
    } catch {
      setErrorMessage('Invalid .apk file.');
    }
  };

  const handleLoadSafeTestApk = async () => {
    setShowApkTools(true);
    const safeFile = await createSafeTestApkFile();
    await handleApkFile(safeFile);
  };

  const quickExamples = [
    { label: lang === 'hi' ? 'नकली SBI KYC' : 'Fake SBI KYC', preset: R4C_SAMPLE_PRESETS[0] },
    { label: lang === 'hi' ? 'बिजली बिल' : 'Power Cutoff', preset: R4C_SAMPLE_PRESETS[1] },
    { label: lang === 'hi' ? '300% निवेश' : '300% Ponzi', preset: R4C_SAMPLE_PRESETS[3] },
    { label: lang === 'hi' ? 'नकली लोन APK' : 'Fake Loan APK', preset: R4C_SAMPLE_PRESETS[2] },
    { label: lang === 'hi' ? 'इंडिया पोस्ट' : 'India Post', preset: R4C_SAMPLE_PRESETS[6] },
  ];

  const topTrendingLinks = heatItems.slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-[22px] sm:text-[30px] md:text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-[#0F172A]">
        {t.heroTitle}
      </h1>

      {/* UNIVERSAL CHECKER CARD */}
      <section className="card-resting rounded-lg p-4 sm:p-6 space-y-4">
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <textarea
            id="kavach-main-input"
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.inputPlaceholder}
            aria-label={t.heroTitle}
            className="w-full p-3.5 sm:p-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[15px] sm:text-[17px] leading-relaxed text-[#0F172A] placeholder:text-[#64748B]"
          />

          {/* Seamless Responsive Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2 sm:gap-2.5">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="col-span-2 sm:col-span-4 lg:col-span-4 min-h-[50px] sm:min-h-[54px] px-4 py-2.5 rounded-lg bg-[#0F172A] text-white text-base sm:text-[17px] font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  {t.checkingBtn}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  {t.checkBtn}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => setShowCameraModal(true)}
              className="lg:col-span-2 min-h-[46px] sm:min-h-[54px] px-3 py-2 rounded-lg bg-white border-2 border-[#0F172A] text-[#0F172A] text-sm font-bold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.cameraBtn}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => photoInputRef.current?.click()}
              className="lg:col-span-2 min-h-[46px] sm:min-h-[54px] px-3 py-2 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.photoUploadBtn}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing && !isRecording}
              onClick={toggleVoiceRecording}
              className={`lg:col-span-2 min-h-[46px] sm:min-h-[54px] px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                isRecording
                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                  : 'bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="tabular-nums truncate">
                    {t.voiceStopBtn} ({recordingSeconds}s)
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.voiceBtn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => audioFileRef.current?.click()}
              className="lg:col-span-2 min-h-[46px] sm:min-h-[54px] px-3 py-2 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.audioUploadBtn}</span>
            </button>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <input
            ref={audioFileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioFileUpload}
          />

          {statusNote && (
            <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3.5 py-2.5 text-sm font-medium text-[#1E3A8A] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{statusNote}</span>
            </div>
          )}

          {scannedPhotoPreview && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <img
                src={scannedPhotoPreview}
                alt="Scanned preview"
                className="w-20 h-14 object-cover rounded border border-[#CBD5E1] shrink-0"
              />
              {photoVisualClues && <p className="text-xs sm:text-sm text-[#334155] line-clamp-2">{photoVisualClues}</p>}
            </div>
          )}

          {voiceTranscript && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#334155]">
              “{voiceTranscript}”
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-[#991B1B] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Single-Row Scrollable Sample Chips on Phone, Wrapping on Desktop */}
          <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
            <span className="text-xs font-bold uppercase text-[#64748B] shrink-0">
              {lang === 'hi' ? 'टेस्ट:' : 'Try:'}
            </span>
            {quickExamples.map((ex) => (
              <button
                key={ex.preset.id}
                type="button"
                disabled={isAnalyzing}
                onClick={() => {
                  setInputText(ex.preset.content);
                  analyzeTextOrLink(ex.preset.content, ex.preset.url, ex.preset.apkMetadata);
                }}
                className="px-3 py-1.5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-white whitespace-nowrap shrink-0"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </form>

        {/* Collapsible APK Scanner */}
        <div className="pt-2.5 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setShowApkTools((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>{t.apkAdvancedToggle}</span>
            {showApkTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showApkTools && (
            <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0F172A]">
                  <FileArchive className="w-4 h-4 shrink-0" />
                  {lang === 'hi' ? '.APK फाइल जांच' : 'Static .APK Check'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={apkFileInputRef}
                    type="file"
                    accept=".apk,.zip"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleApkFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => apkFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-md bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A]"
                  >
                    Upload .APK
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSafeTestApk}
                    className="px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold"
                  >
                    {lang === 'hi' ? 'टेस्ट .APK' : 'Test APK'}
                  </button>
                </div>
              </div>

              {parsedApk && (
                <div className="text-xs font-mono text-[#0F172A] bg-white border border-[#E2E8F0] rounded px-3 py-1.5 truncate">
                  {parsedApk.fileName} ({parsedApk.fileSizeKb} KB · {parsedApk.detectedPermissions.length} perms)
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={apkAppName}
                  onChange={(e) => setApkAppName(e.target.value)}
                  placeholder="App Name"
                  className="min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
                />
                <input
                  type="text"
                  value={apkPackageName}
                  onChange={(e) => setApkPackageName(e.target.value)}
                  placeholder="com.example.app"
                  className="min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] font-mono text-sm text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {APK_PERMISSION_OPTIONS.map((p) => {
                  const checked = apkPermissions.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white border border-[#CBD5E1] text-xs font-medium text-[#0F172A] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setApkPermissions((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                          )
                        }
                        className="w-3.5 h-3.5 accent-[#0F172A] shrink-0"
                      />
                      <span className="truncate">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LIVE RESULT OUTPUT */}
      {latestResult && (
        <div ref={resultSectionRef}>
          <AnalysisResultPanel
            record={latestResult}
            lang={lang}
            onInspectUrl={onInspectUrl}
            onCaseUpdated={onCaseUpdated}
            onOpenEmergency={onOpenEmergency}
          />
        </div>
      )}

      {/* TRENDING SCAMS STRIP */}
      <section className="space-y-4 pt-3 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-[#DC2626] shrink-0" />
            <h2 className="text-lg sm:text-[22px] font-bold text-[#0F172A] truncate">
              {t.trendingHeading}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenTrendingTab}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
          >
            <Newspaper className="w-4 h-4" />
            {lang === 'hi' ? 'सभी देखें →' : 'See All →'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {isInvestigator && topTrendingLinks.length > 0 && (
            <div className="lg:col-span-5 card-resting rounded-lg p-4 sm:p-5 space-y-3">
              <h3 className="text-base font-bold text-[#0F172A]">
                {lang === 'hi' ? 'अधिकारी हीट-लिस्ट' : 'Officer Heat-List'}
              </h3>
              <div className="divide-y divide-[#F1F5F9]">
                {topTrendingLinks.map((item) => {
                  const waText = encodeURIComponent(
                    lang === 'hi'
                      ? `⚠️ कवच अलर्ट: ${item.value.replace(/\./g, '[.]')} (${item.reportCount} रिपोर्ट)। क्लिक न करें! 1930`
                      : `⚠️ Kavach Alert: ${item.value.replace(/\./g, '[.]')} (${item.reportCount} reports). Do NOT click! 1930`
                  );
                  return (
                    <div key={`${item.type}-${item.value}`} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#0F172A] break-all">
                          {item.type === 'domain' ? item.value.replace(/\./g, '[.]') : item.value}
                        </span>
                        <RiskBadge level={item.riskLevel} size="sm" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                        <span className="tabular-nums truncate">
                          {item.reportCount} {lang === 'hi' ? 'रिपोर्ट' : 'reports'}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const sample =
                                item.type === 'domain' ? `http://${item.value}` : item.value;
                              setInputText(sample);
                              analyzeTextOrLink(sample, item.type === 'domain' ? `http://${item.value}` : undefined);
                            }}
                            className="font-bold text-[#0F172A] hover:underline"
                          >
                            {t.checkThisBtn}
                          </button>
                          <a
                            href={`https://wa.me/?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-[#166534] hover:underline"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className={`${
              isInvestigator && topTrendingLinks.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
            } grid grid-cols-1 sm:grid-cols-2 gap-3.5`}
          >
            {TRENDING_SCAM_NEWS.slice(0, 4).map((news) => {
              const waHref = `https://wa.me/?text=${encodeURIComponent(
                lang === 'hi'
                  ? `⚠️ कवच अलर्ट: ${news.titleHi} — ${news.summaryHi} (1930)`
                  : `⚠️ Kavach Alert: ${news.titleEn} — ${news.summaryEn} (1930)`
              )}`;
              return (
                <article
                  key={news.id}
                  className="card-resting rounded-lg p-4 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#475569]">
                      <span className="truncate">{lang === 'hi' ? news.tagHi : news.tagEn}</span>
                      <RiskBadge level={news.severity} size="sm" />
                    </div>
                    <h3 className="text-[15px] font-bold text-[#0F172A] leading-snug">
                      {lang === 'hi' ? news.titleHi : news.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#475569] line-clamp-2">
                      {lang === 'hi' ? news.summaryHi : news.summaryEn}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(news.sampleTriggerText);
                        analyzeTextOrLink(news.sampleTriggerText, news.sampleUrl);
                      }}
                      className="font-bold text-[#2563EB] hover:underline"
                    >
                      {t.checkThisBtn}
                    </button>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#166534] hover:underline"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {showCameraModal && (
        <CameraCaptureModal
          lang={lang}
          onCapture={analyzeImageBase64}
          onClose={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
}
