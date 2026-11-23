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
  onLangChange: (lang: AppLanguage) => void;
  heatItems: HeatListItem[];
  latestResult: CaseRecord | null;
  onCaseCreated: (record: CaseRecord) => void;
  onCaseUpdated: (record: CaseRecord) => void;
  onInspectUrl: (url: string, record: CaseRecord) => void;
  onOpenTrendingTab: () => void;
  onOpenEmergency: () => void;
}

const APK_PERMISSION_OPTIONS = [
  { id: 'android.permission.READ_CONTACTS', label: 'READ_CONTACTS (Phonebook)' },
  { id: 'android.permission.READ_SMS', label: 'READ_SMS (Banking OTPs)' },
  { id: 'android.permission.RECEIVE_SMS', label: 'RECEIVE_SMS (Live OTP)' },
  { id: 'android.permission.READ_CALL_LOG', label: 'READ_CALL_LOG (Call History)' },
  { id: 'android.permission.CAMERA', label: 'CAMERA (Selfie / Photos)' },
  { id: 'android.permission.SYSTEM_ALERT_WINDOW', label: 'SYSTEM_ALERT_WINDOW (Overlay)' },
];

export function ThreatScannerView({
  lang,
  onLangChange,
  heatItems,
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

  // Photo / Camera state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [scannedPhotoPreview, setScannedPhotoPreview] = useState<string | null>(null);
  const [photoVisualClues, setPhotoVisualClues] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Voice / Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioFileRef = useRef<HTMLInputElement | null>(null);

  // Collapsible APK Inspector (keeps home screen ultra-clean for kids & elders)
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

  // Universal Smart Text / Link / APK Analysis
  const analyzeTextOrLink = async (
    textToCheck: string,
    explicitUrl?: string,
    apkMeta?: SampleCasePreset['apkMetadata']
  ) => {
    const trimmed = textToCheck.trim();
    if (!trimmed && !explicitUrl && !apkMeta) {
      setErrorMessage(
        lang === 'hi'
          ? 'कृपया कोई भी लिंक, SMS या WhatsApp मैसेज पेस्ट करें।'
          : 'Please paste a link, SMS, or WhatsApp message first.'
      );
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusNote(lang === 'hi' ? 'लिंक और मैसेज की जांच हो रही है…' : 'Scanning link & message…');
    setScannedPhotoPreview(null);
    setPhotoVisualClues(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          url: explicitUrl,
          lang,
          channel: /^https?:\/\//i.test(trimmed) ? 'Web Browser' : 'WhatsApp',
          submittedBy: 'Kavach Citizen Quick Check',
          apkMetadata: apkMeta,
          saveToLedger: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      onCaseCreated(data.caseRecord as CaseRecord);
      scrollToResult();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to check right now.');
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

  // Photo / Camera Image Scan
  const analyzeImageBase64 = async (base64Data: string, mimeType: string, previewUrl: string) => {
    setShowCameraModal(false);
    setScannedPhotoPreview(previewUrl);
    setPhotoVisualClues(null);
    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusNote(
      lang === 'hi'
        ? 'फोटो से लिंक व टेक्स्ट पढ़कर स्कैम की जांच हो रही है…'
        : 'Reading text & links from your photo…'
    );

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
      if (!res.ok) throw new Error(data.error || 'Could not scan photo.');

      if (data.extractedText) {
        setInputText(data.extractedText);
      }
      if (data.visualClues) {
        setPhotoVisualClues(data.visualClues);
      }
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
      if (base64) {
        analyzeImageBase64(base64, file.type || 'image/jpeg', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Recording & Audio File Upload
  const submitAudioBlob = async (blob: Blob, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setVoiceTranscript(null);
    setStatusNote(
      lang === 'hi'
        ? 'आपकी आवाज़ समझकर स्कैम की जांच हो रही है…'
        : 'Listening to audio and checking for scams…'
    );

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(new Error('Failed to read audio.'));
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
        throw new Error(
          lang === 'hi'
            ? 'माइक उपलब्ध नहीं है। आप ऑडियो फाइल अपलोड कर सकते हैं।'
            : 'Microphone unavailable. You can upload an audio clip instead.'
        );
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
        if (audioBlob.size > 0) {
          submitAudioBlob(audioBlob, mime);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : lang === 'hi'
          ? 'माइक की अनुमति नहीं मिली।'
          : 'Microphone permission denied.'
      );
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    submitAudioBlob(file, file.type || 'audio/mp3');
    e.target.value = '';
  };

  // Static APK File Handler
  const handleApkFile = async (file: File) => {
    try {
      const summary = await inspectApkArchive(file);
      setParsedApk(summary);
      setApkAppName(file.name.replace(/\.(apk|zip)$/i, '').replace(/[_-]+/g, ' '));
      if (summary.detectedPackageName) setApkPackageName(summary.detectedPackageName);
      if (summary.detectedPermissions.length > 0) setApkPermissions(summary.detectedPermissions);
      if (summary.embeddedStrings.length > 0) {
        setInputText(
          `APK File: ${file.name}\nEmbedded endpoints: ${summary.embeddedStrings.join('\n')}`
        );
      }
    } catch {
      setErrorMessage('Could not parse .apk archive.');
    }
  };

  const handleLoadSafeTestApk = async () => {
    setShowApkTools(true);
    const safeFile = await createSafeTestApkFile();
    await handleApkFile(safeFile);
  };

  const quickExamples = [
    {
      label: lang === 'hi' ? 'नकली SBI KYC लिंक' : 'Fake SBI KYC SMS',
      preset: R4C_SAMPLE_PRESETS[0],
    },
    {
      label: lang === 'hi' ? 'बिजली कटने वाला मैसेज' : 'Electricity Cutoff',
      preset: R4C_SAMPLE_PRESETS[1],
    },
    {
      label: lang === 'hi' ? '300% फर्जी निवेश साइट' : '300% Ponzi Site',
      preset: R4C_SAMPLE_PRESETS[3],
    },
    {
      label: lang === 'hi' ? 'नकली लोन APK ऐप' : 'Fake Loan APK',
      preset: R4C_SAMPLE_PRESETS[2],
    },
    {
      label: lang === 'hi' ? 'असली इंडिया पोस्ट (सुरक्षित)' : 'Real India Post (Safe)',
      preset: R4C_SAMPLE_PRESETS[6],
    },
  ];

  const topTrendingLinks = heatItems.slice(0, 4);

  return (
    <div className="space-y-10">
      {/* SHORT, CLEAR HEADER + LANGUAGE SWITCHER */}
      <section className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] sm:text-[32px] md:text-[36px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#0F172A] min-w-0">
          {t.heroTitle}
        </h1>

        {/* Effortless Hindi / English Toggle */}
        <div
          className="inline-flex items-center p-1 bg-white border border-[#CBD5E1] rounded-lg shrink-0"
          role="group"
          aria-label="Language switch"
        >
          <button
            type="button"
            onClick={() => onLangChange('hi')}
            className={`min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'hi' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'en' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            English
          </button>
        </div>
      </section>

      {/* MAIN UNIVERSAL KAVACH CHECKER CARD */}
      <section className="card-resting rounded-lg p-4 sm:p-6 md:p-8 space-y-5">
        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label
              htmlFor="kavach-main-input"
              className="block text-[16px] sm:text-[17px] font-bold text-[#0F172A] mb-2"
            >
              {lang === 'hi' ? 'लिंक या मैसेज यहाँ डालें' : 'Paste link or message'}
            </label>
            <textarea
              id="kavach-main-input"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="w-full p-3.5 sm:p-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[16px] sm:text-[18px] leading-[26px] sm:leading-[28px] text-[#0F172A] placeholder:text-[#64748B]"
            />
          </div>

          {/* PHONE-FRIENDLY ACTION GRID: Full-width Check Now + 2x2 Photo/Voice Grid on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2.5 sm:gap-3">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="col-span-2 sm:col-span-4 lg:col-span-4 min-h-[56px] sm:min-h-[60px] px-5 py-3 rounded-lg bg-[#0F172A] text-white text-[17px] sm:text-[18px] font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.checkingBtn}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  {t.checkBtn}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => setShowCameraModal(true)}
              className="lg:col-span-2 min-h-[52px] sm:min-h-[60px] px-3 py-2.5 rounded-lg bg-white border-2 border-[#0F172A] text-[#0F172A] text-sm sm:text-[15px] font-bold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t.cameraBtn}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => photoInputRef.current?.click()}
              className="lg:col-span-2 min-h-[52px] sm:min-h-[60px] px-3 py-2.5 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-sm sm:text-[15px] font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t.photoUploadBtn}</span>
            </button>

            <button
              type="button"
              disabled={isAnalyzing && !isRecording}
              onClick={toggleVoiceRecording}
              className={`lg:col-span-2 min-h-[52px] sm:min-h-[60px] px-3 py-2.5 rounded-lg text-sm sm:text-[15px] font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                isRecording
                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                  : 'bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 fill-current shrink-0" />
                  <span className="tabular-nums truncate">
                    {t.voiceStopBtn} ({recordingSeconds}s)
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">{t.voiceBtn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => audioFileRef.current?.click()}
              className="lg:col-span-2 min-h-[52px] sm:min-h-[60px] px-3 py-2.5 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-sm sm:text-[15px] font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
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

          {/* Status / Transcript / Photo Preview Feedback */}
          {statusNote && (
            <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3 text-[16px] font-medium text-[#1E3A8A] flex items-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <span>{statusNote}</span>
            </div>
          )}

          {scannedPhotoPreview && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row items-start gap-4">
              <img
                src={scannedPhotoPreview}
                alt="Scanned link or message screenshot"
                className="w-28 h-20 object-cover rounded border border-[#CBD5E1] shrink-0"
              />
              <div className="space-y-1 text-sm">
                <div className="font-bold text-[#0F172A]">
                  {lang === 'hi' ? 'फोटो से पढ़ा गया विवरण:' : 'Photo Scanned:'}
                </div>
                {photoVisualClues && <p className="text-[#334155]">{photoVisualClues}</p>}
              </div>
            </div>
          )}

          {voiceTranscript && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
              <strong className="text-[#0F172A]">
                {lang === 'hi' ? 'आपने बोला:' : 'Voice Detected:'}
              </strong>{' '}
              “{voiceTranscript}”
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3.5 text-[#991B1B] text-[16px] flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* One-Tap Sample Test Chips */}
          <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#475569] mr-1">
              {lang === 'hi' ? 'टेस्ट करके देखें:' : 'Try a quick test:'}
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
                className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-white whitespace-nowrap"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </form>

        {/* Collapsible Android APK Static Inspection Drawer */}
        <div className="pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setShowApkTools((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            <Smartphone className="w-4 h-4" />
            <span>{t.apkAdvancedToggle}</span>
            {showApkTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showApkTools && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileArchive className="w-5 h-5 text-[#0F172A]" />
                  <span className="text-[15px] font-bold text-[#0F172A]">
                    {lang === 'hi'
                      ? 'संदिग्ध Android .APK फाइल की सुरक्षित जांच (बिना इंस्टॉल किए)'
                      : 'Safe Static Android .APK File Scanner (No Installation)'}
                  </span>
                </div>
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
                    className="px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
                  >
                    Upload .APK
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSafeTestApk}
                    className="px-3.5 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B]"
                  >
                    {lang === 'hi' ? 'टेस्ट .APK लोड करें' : 'Load Safe Test APK'}
                  </button>
                </div>
              </div>

              {parsedApk && (
                <div className="text-xs font-mono text-[#0F172A] bg-white border border-[#E2E8F0] rounded px-3 py-2">
                  Loaded: {parsedApk.fileName} ({parsedApk.fileSizeKb} KB, {parsedApk.archiveEntriesCount} entries,{' '}
                  {parsedApk.detectedPermissions.length} permissions detected)
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={apkAppName}
                  onChange={(e) => setApkAppName(e.target.value)}
                  placeholder="App Name (e.g. QuickRupee VIP)"
                  className="min-h-[44px] px-3.5 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
                />
                <input
                  type="text"
                  value={apkPackageName}
                  onChange={(e) => setApkPackageName(e.target.value)}
                  placeholder="Package ID (e.g. com.quickrupee.vip.cashloan)"
                  className="min-h-[44px] px-3.5 rounded-lg bg-white border border-[#94A3B8] font-mono text-sm text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {APK_PERMISSION_OPTIONS.map((p) => {
                  const checked = apkPermissions.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-[#CBD5E1] text-xs font-medium text-[#0F172A] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setApkPermissions((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                          )
                        }
                        className="w-4 h-4 accent-[#0F172A]"
                      />
                      <span>{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LIVE RESULT OUTPUT (Verdict + Audio + WhatsApp Share + Police Report Form) */}
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

      {/* LIVE TRENDING SCAM LINKS & CYBER NEWS STRIP RIGHT ON HOME PAGE */}
      <section className="space-y-5 pt-4 border-t border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#DC2626]" />
              <h2 className="text-[24px] font-bold text-[#0F172A]">{t.trendingHeading}</h2>
            </div>
            <p className="text-[16px] text-[#475569] mt-0.5">{t.trendingSub}</p>
          </div>
          <button
            type="button"
            onClick={onOpenTrendingTab}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:underline whitespace-nowrap self-start sm:self-auto"
          >
            <Newspaper className="w-4 h-4" />
            {lang === 'hi' ? 'सभी ट्रेंडिंग स्कैम देखें →' : 'See All Trending Scams →'}
          </button>
        </div>

        {/* 2-Column Split: Trending Reported Scam Links + Latest Fraud News */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Trending Malicious Links & UPIs */}
          <div className="lg:col-span-5 card-resting rounded-lg p-6 space-y-4">
            <h3 className="text-[18px] font-bold text-[#0F172A]">
              {lang === 'hi' ? 'ट्रेंडिंग खतरनाक लिंक व UPI' : 'Trending Scam Links & UPIs'}
            </h3>
            <div className="divide-y divide-[#F1F5F9]">
              {topTrendingLinks.map((item) => {
                const waText = encodeURIComponent(
                  lang === 'hi'
                    ? `⚠️ *कवच चेतावनी*: यह ${item.value.replace(/\./g, '[.]')} एक खतरनाक स्कैम (${item.associatedCategories[0]}) में ${item.reportCount} बार रिपोर्ट हुआ है। क्लिक न करें और पैसे न भेजें! हेल्पलाइन: 1930`
                    : `⚠️ *Kavach Alert*: ${item.value.replace(/\./g, '[.]')} has been reported ${item.reportCount} times for ${item.associatedCategories[0]}. Do NOT click or pay! Helpline: 1930`
                );
                return (
                  <div key={`${item.type}-${item.value}`} className="py-3.5 first:pt-1 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-[#0F172A] break-all">
                        {item.type === 'domain' ? item.value.replace(/\./g, '[.]') : item.value}
                      </span>
                      <RiskBadge level={item.riskLevel} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
                      <span className="tabular-nums">
                        {item.reportCount} {lang === 'hi' ? 'रिपोर्ट' : 'reports'} · {item.associatedCategories[0]}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const sample =
                              item.type === 'domain'
                                ? `http://${item.value}`
                                : `Suspicious scam identifier: ${item.value}`;
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

          {/* Latest Scam News Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRENDING_SCAM_NEWS.slice(0, 4).map((news) => {
              const waHref = `https://wa.me/?text=${encodeURIComponent(
                lang === 'hi'
                  ? `⚠️ *कवच साइबर अलर्ट*\n${news.titleHi}\n${news.summaryHi}\nसावधान रहें — हेल्पलाइन 1930`
                  : `⚠️ *Kavach Cyber Alert*\n${news.titleEn}\n${news.summaryEn}\nStay safe — Helpline 1930`
              )}`;
              return (
                <article
                  key={news.id}
                  className="card-resting rounded-lg p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#475569]">
                      <span>{lang === 'hi' ? news.tagHi : news.tagEn}</span>
                      <RiskBadge level={news.severity} size="sm" />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0F172A] leading-snug">
                      {lang === 'hi' ? news.titleHi : news.titleEn}
                    </h3>
                    <p className="text-sm text-[#475569] leading-relaxed">
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
                      {lang === 'hi' ? 'कवच पर जांचें' : 'Inspect Sample'}
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

      {/* Live Camera Capture Modal */}
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
