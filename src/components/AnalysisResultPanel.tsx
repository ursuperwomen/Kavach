import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Link2,
  Loader2,
  PhoneCall,
  Printer,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Square,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UI_COPY } from '../data/translations';
import type { AppLanguage, CaseRecord } from '../types/forensics';
import {
  defangUrl,
  downloadJsonEvidenceBundle,
  downloadPdfEvidenceReport,
  formatTimestamp,
} from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface AnalysisResultPanelProps {
  record: CaseRecord;
  lang: AppLanguage;
  onInspectUrl: (url: string, record: CaseRecord) => void;
  onOpenLinkedCase?: (caseId: string) => void;
  onPivotIdentifier?: (identifier: string) => void;
  onCaseUpdated?: (updated: CaseRecord) => void;
  onOpenEmergency?: () => void;
}

export function AnalysisResultPanel({
  record,
  lang,
  onInspectUrl,
  onOpenLinkedCase,
  onPivotIdentifier,
  onCaseUpdated,
  onOpenEmergency,
}: AnalysisResultPanelProps) {
  const t = UI_COPY[lang];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Audio playback (Gemini 3.8 TTS via gesture-unlocked Web Audio API + Blob fallback)
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  const stopAudioPlayback = () => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.onended = null;
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      audioSourceRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
    setAudioStatus('idle');
  };

  useEffect(() => {
    stopAudioPlayback();
    setAudioError(null);
    return () => {
      stopAudioPlayback();
    };
  }, [record.caseId, lang]);

  // Direct Report to Cyber Police form state
  const [policeCity, setPoliceCity] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [moneyLost, setMoneyLost] = useState(false);
  const [amountInr, setAmountInr] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [isFilingPolice, setIsFilingPolice] = useState(false);
  const [policeError, setPoliceError] = useState<string | null>(null);
  const policeFormRef = useRef<HTMLElement | null>(null);

  const handleCopy = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedId(value);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const primaryLink = record.identifiers.urls[0] || record.identifiers.domains[0];
  const whatsappMessage =
    lang === 'hi'
      ? `🛡️ *कवच अलर्ट*: ${
          record.riskLevel === 'HIGH' ? '🔴 स्कैम' : record.riskLevel === 'MEDIUM' ? '🟡 संदिग्ध' : '🟢 सुरक्षित'
        }\n${record.title}${primaryLink ? `\nलिंक: ${defangUrl(primaryLink)}` : ''}\nकेस: ${
          record.caseId
        } | हेल्पलाइन: 1930`
      : `🛡️ *Kavach Alert*: ${
          record.riskLevel === 'HIGH' ? '🔴 SCAM' : record.riskLevel === 'MEDIUM' ? '🟡 SUSPICIOUS' : '🟢 SAFE'
        }\n${record.title}${primaryLink ? `\nLink: ${defangUrl(primaryLink)}` : ''}\nCase: ${
          record.caseId
        } | Helpline: 1930`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard?.writeText(whatsappMessage);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  const handleListenVerdict = async () => {
    setAudioError(null);
    if (audioStatus === 'loading' || audioStatus === 'playing') {
      stopAudioPlayback();
      return;
    }

    let ctx: AudioContext | null = null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioCtx();
        }
        ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
      }
    } catch {
      ctx = null;
    }

    const spokenText =
      lang === 'hi'
        ? `${
            record.riskLevel === 'HIGH'
              ? 'सावधान! यह स्कैम है।'
              : record.riskLevel === 'MEDIUM'
              ? 'ध्यान दें! यह संदिग्ध है।'
              : 'यह सुरक्षित लगता है।'
          } ${record.aiBrief?.whatIsThisLink || ''} ${
            record.aiBrief?.citizenWarning ||
            (record.riskLevel === 'HIGH'
              ? 'लिंक न खोलें और OTP या पैसे न भेजें। मदद के लिए 1930 पर कॉल करें।'
              : 'आगे बढ़ने से पहले जांच करें।')
          }`
        : `${
            record.riskLevel === 'HIGH'
              ? 'Warning! This is a scam.'
              : record.riskLevel === 'MEDIUM'
              ? 'Be careful! This looks suspicious.'
              : 'This looks safe.'
          } ${record.aiBrief?.whatIsThisLink || ''} ${
            record.aiBrief?.citizenWarning ||
            (record.riskLevel === 'HIGH'
              ? 'Do not click the link, share OTPs, or send money. Call 1930 for help.'
              : 'Always verify before sharing personal details.')
          }`;

    const abortController = new AbortController();
    ttsAbortRef.current = abortController;
    setAudioStatus('loading');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, lang }),
        signal: abortController.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.audioBase64) throw new Error(data.error || 'Audio error.');
      if (abortController.signal.aborted) return;

      const binaryStr = window.atob(data.audioBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      if (ctx) {
        try {
          if (ctx.state === 'suspended') await ctx.resume();
          const decodedBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
          if (abortController.signal.aborted) return;
          const source = ctx.createBufferSource();
          source.buffer = decodedBuffer;
          source.connect(ctx.destination);
          source.onended = () => {
            audioSourceRef.current = null;
            setAudioStatus('idle');
          };
          audioSourceRef.current = source;
          setAudioStatus('playing');
          source.start(0);
          return;
        } catch {
          // fallback below
        }
      }

      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      audioObjectUrlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onended = () => stopAudioPlayback();
      audio.onerror = () => {
        stopAudioPlayback();
        setAudioError(lang === 'hi' ? 'ऑडियो नहीं चला।' : 'Audio playback failed.');
      };
      setAudioStatus('playing');
      await audio.play();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAudioStatus('idle');
        return;
      }
      stopAudioPlayback();
      setAudioError(err instanceof Error ? err.message : 'Audio unavailable.');
    }
  };

  const handleSubmitPoliceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoliceError(null);
    setIsFilingPolice(true);
    try {
      const res = await fetch('/api/report-police', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: record.caseId,
          reporterName: reporterName.trim() || undefined,
          city: policeCity.trim() || 'India',
          moneyLost,
          amountInr: moneyLost ? amountInr.trim() : undefined,
          extraDetails: extraDetails.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.caseRecord) throw new Error(data.error || 'Report failed.');
      onCaseUpdated?.(data.caseRecord as CaseRecord);
    } catch (err) {
      setPoliceError(err instanceof Error ? err.message : 'Unable to submit.');
    } finally {
      setIsFilingPolice(false);
    }
  };

  const bannerStyles =
    record.riskLevel === 'HIGH'
      ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
      : record.riskLevel === 'MEDIUM'
      ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
      : 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]';

  const bigVerdictText =
    record.riskLevel === 'HIGH'
      ? t.verdictHigh
      : record.riskLevel === 'MEDIUM'
      ? t.verdictMed
      : t.verdictLow;

  const fallbackWhatIsIt =
    lang === 'hi'
      ? record.technical.lookAlikeTarget
        ? `${record.technical.lookAlikeTarget} की नकल करने वाला नकली लिंक।`
        : record.riskLevel === 'HIGH'
        ? `${record.threatCategory} स्कैम।`
        : record.riskLevel === 'MEDIUM'
        ? 'संदिग्ध लिंक — बिना जांचे भरोसा न करें।'
        : 'सुरक्षित प्रतीत होता है।'
      : record.technical.lookAlikeTarget
      ? `Fake copycat of ${record.technical.lookAlikeTarget}.`
      : record.riskLevel === 'HIGH'
      ? `Fraudulent ${record.threatCategory} attempt.`
      : record.riskLevel === 'MEDIUM'
      ? 'Suspicious item — verify first.'
      : 'No scam patterns found.';

  const identifierGroups: Array<{
    key: string;
    label: string;
    items: string[];
    isUrl?: boolean;
  }> = [
    { key: 'domains', label: lang === 'hi' ? 'डोमेन' : 'Domains', items: record.identifiers.domains },
    { key: 'urls', label: 'URLs', items: record.identifiers.urls, isUrl: true },
    { key: 'phones', label: lang === 'hi' ? 'फोन' : 'Phones', items: record.identifiers.phoneNumbers },
    { key: 'upis', label: 'UPI', items: record.identifiers.upiIds },
    { key: 'banks', label: lang === 'hi' ? 'बैंक' : 'Bank', items: record.identifiers.bankAccounts },
    { key: 'ifsc', label: 'IFSC', items: record.identifiers.ifscCodes },
    { key: 'crypto', label: 'Crypto', items: record.identifiers.cryptoWallets },
    { key: 'packages', label: 'APK', items: record.identifiers.packageNames },
    { key: 'ips', label: 'IP', items: record.identifiers.ipAddresses },
    { key: 'emails', label: 'Email', items: record.identifiers.emails },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. VERDICT CARD */}
      <section className="card-resting rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569]">
            <span className="font-mono font-bold text-[#0F172A]">{record.caseId}</span>
            <span>·</span>
            <span>{record.channel}</span>
            <span>·</span>
            <span className="tabular-nums">{formatTimestamp(record.createdAt)}</span>
          </div>
          <RiskBadge level={record.riskLevel} score={record.riskScore} />
        </div>

        <div className={`rounded-lg border p-4 sm:p-5 space-y-2 ${bannerStyles}`}>
          <div className="flex items-start gap-3">
            {record.riskLevel === 'LOW' ? (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1.5 flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{bigVerdictText}</h2>
              <p className="text-sm sm:text-base font-semibold text-[#0F172A]">
                {record.aiBrief?.whatIsThisLink || fallbackWhatIsIt}
              </p>
              {record.aiBrief?.citizenWarning && (
                <p className="text-sm sm:text-[15px] text-[#0F172A] leading-snug">
                  {record.aiBrief.citizenWarning}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3 PRIMARY ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleListenVerdict}
            aria-pressed={audioStatus !== 'idle'}
            className={`min-h-[48px] px-4 py-2.5 rounded-lg text-white text-sm sm:text-[15px] font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              audioStatus === 'playing'
                ? 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                : 'bg-[#0F172A] hover:bg-[#1E293B]'
            }`}
          >
            {audioStatus === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{lang === 'hi' ? 'तैयार हो रहा…' : 'Loading…'}</span>
              </>
            ) : audioStatus === 'playing' ? (
              <>
                <Square className="w-4 h-4 fill-current shrink-0" />
                <span>{t.listeningBtn}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 shrink-0" />
                <span>{t.listenBtn}</span>
              </>
            )}
          </button>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[#16A34A] text-white text-sm sm:text-[15px] font-bold hover:bg-[#15803D] inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>{t.shareWaBtn}</span>
          </a>

          <button
            type="button"
            onClick={() => policeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[#DC2626] text-white text-sm sm:text-[15px] font-bold hover:bg-[#B91C1C] inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Siren className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'पुलिस रिपोर्ट' : 'Report Police'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
          >
            {waCopied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
            {waCopied ? t.copiedWaBtn : t.copyWaBtn}
          </button>

          {record.riskLevel !== 'LOW' && onOpenEmergency && (
            <button
              type="button"
              onClick={onOpenEmergency}
              className="inline-flex items-center gap-1.5 font-bold text-[#DC2626] hover:underline"
            >
              <PhoneCall className="w-4 h-4" />
              {lang === 'hi' ? 'पैसे कटे? 1930 मदद' : 'Lost money? 1930 Help'}
            </button>
          )}
        </div>

        {audioError && (
          <div className="rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-xs sm:text-sm text-[#92400E] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}

        {record.aiBrief?.recommendedActions && record.aiBrief.recommendedActions.length > 0 && (
          <div className="pt-3 border-t border-[#F1F5F9] space-y-2">
            <h3 className="text-sm font-bold text-[#0F172A]">{t.whatToDoLabel}</h3>
            <ol className="space-y-1.5 text-sm sm:text-[15px] text-[#0F172A]">
              {record.aiBrief.recommendedActions.slice(0, 3).map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* 2. REPORT TO CYBER POLICE */}
      <section ref={policeFormRef} className="card-resting rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
              <Siren className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">{t.reportPoliceTitle}</h3>
              <p className="text-xs sm:text-sm text-[#475569]">{t.reportPoliceSub}</p>
            </div>
          </div>
          <a
            href="tel:1930"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-bold text-xs sm:text-sm whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            1930
          </a>
        </div>

        {record.policeReport ? (
          <div className="rounded-lg border border-[#86EFAC] bg-[#F0FDF4] p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#166534] font-bold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{lang === 'hi' ? 'शिकायत दर्ज हो गई!' : 'Report Filed!'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-[#475569] block">{lang === 'hi' ? 'नंबर' : 'ID'}</span>
                <span className="font-mono font-bold text-[#0F172A]">{record.policeReport.complaintNumber}</span>
              </div>
              <div>
                <span className="text-[#475569] block">{lang === 'hi' ? 'शहर' : 'City'}</span>
                <span className="font-semibold text-[#0F172A]">{record.policeReport.city}</span>
              </div>
              <div>
                <span className="text-[#475569] block">{lang === 'hi' ? 'स्थिति' : 'Status'}</span>
                <span className="font-semibold text-[#166534]">{record.policeReport.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadPdfEvidenceReport(record)}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                {lang === 'hi' ? 'PDF डाउनलोड' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={() => downloadJsonEvidenceBundle(record)}
                className="min-h-[42px] px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPoliceReport} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={policeCity}
                onChange={(e) => setPoliceCity(e.target.value)}
                placeholder={lang === 'hi' ? 'शहर / राज्य (जैसे: दिल्ली)' : 'City / State'}
                className="w-full min-h-[46px] px-3.5 rounded-lg bg-white border border-[#94A3B8] text-sm sm:text-[15px] text-[#0F172A]"
              />
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder={lang === 'hi' ? 'नाम (वैकल्पिक)' : 'Name (Optional)'}
                className="w-full min-h-[46px] px-3.5 rounded-lg bg-white border border-[#94A3B8] text-sm sm:text-[15px] text-[#0F172A]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="flex items-center gap-2.5 min-h-[46px] px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={moneyLost}
                  onChange={(e) => setMoneyLost(e.target.checked)}
                  className="w-4 h-4 accent-[#DC2626]"
                />
                <span className="text-sm font-semibold text-[#0F172A]">
                  {lang === 'hi' ? 'पैसे कट गए हैं' : 'Money lost'}
                </span>
              </label>

              {moneyLost && (
                <input
                  type="text"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  placeholder={lang === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}
                  className="flex-1 min-h-[46px] px-3.5 rounded-lg bg-white border border-[#DC2626] text-sm text-[#0F172A]"
                />
              )}

              <input
                type="text"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder={lang === 'hi' ? 'UTR / अन्य विवरण (वैकल्पिक)' : 'UTR / details (optional)'}
                className="flex-1 min-h-[46px] px-3.5 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
              />
            </div>

            {policeError && <p className="text-xs sm:text-sm font-semibold text-[#991B1B]">{policeError}</p>}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={isFilingPolice}
                className="min-h-[46px] px-5 py-2.5 rounded-lg bg-[#DC2626] text-white text-sm sm:text-[15px] font-bold hover:bg-[#B91C1C] disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
              >
                {isFilingPolice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Siren className="w-4 h-4" />}
                {t.reportPoliceBtn}
              </button>

              <button
                type="button"
                onClick={() => downloadPdfEvidenceReport(record)}
                className="min-h-[46px] px-4 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                {lang === 'hi' ? 'PDF रिपोर्ट' : 'PDF Report'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[46px] px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 3. COLLAPSIBLE EVIDENCE DETAILS */}
      <div className="card-resting rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((v) => !v)}
          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-left bg-white hover:bg-[#F8FAFC]"
        >
          <span className="text-base sm:text-lg font-bold text-[#0F172A]">
            {t.whyFlaggedLabel} ({record.indicators.length})
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-5 h-5 text-[#0F172A] shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#0F172A] shrink-0" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="px-4 sm:px-6 pb-6 pt-2 space-y-5 border-t border-[#E2E8F0]">
            <div className="divide-y divide-[#F1F5F9]">
              {record.indicators.map((ind) => (
                <div key={ind.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-mono text-[#64748B]">
                      {ind.id} · {ind.category}
                    </div>
                    <h4 className="text-sm sm:text-[15px] font-semibold text-[#0F172A]">{ind.title}</h4>
                    <p className="text-xs sm:text-sm text-[#334155]">{ind.explanation}</p>
                  </div>
                  <RiskBadge level={ind.severity} size="sm" />
                </div>
              ))}
            </div>

            {record.technical.apkInfo && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span className="break-all">APK: {record.technical.apkInfo.packageName}</span>
                </div>
                {record.technical.apkInfo.dangerousPermissions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {record.technical.apkInfo.dangerousPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="font-mono text-xs font-semibold rounded border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-2 py-1 break-all"
                      >
                        {perm.replace('android.permission.', '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-[#E2E8F0]">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-sm font-bold uppercase text-[#475569]">
                  {lang === 'hi' ? 'निकाले गए सबूत' : 'Extracted Identifiers'}
                </h4>
                {identifierGroups.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[#64748B]">
                    {lang === 'hi' ? 'कोई बाहरी लिंक/UPI नहीं।' : 'None extracted.'}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {identifierGroups.map((group) => (
                      <div key={group.key} className="space-y-1">
                        <div className="text-[11px] font-bold uppercase text-[#64748B]">{group.label}</div>
                        {group.items.map((item) => (
                          <div
                            key={item}
                            className="flex flex-wrap items-center justify-between gap-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5"
                          >
                            <span className="font-mono text-xs font-medium text-[#0F172A] break-all">
                              {group.isUrl ? defangUrl(item) : item}
                            </span>
                            <div className="flex items-center gap-2.5 shrink-0">
                              {group.isUrl && (
                                <button
                                  type="button"
                                  onClick={() => onInspectUrl(item, record)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC2626] hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Warn
                                </button>
                              )}
                              {onPivotIdentifier && (
                                <button
                                  type="button"
                                  onClick={() => onPivotIdentifier(item)}
                                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                                >
                                  Pivot
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(group.isUrl ? defangUrl(item) : item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569]"
                              >
                                {copiedId === (group.isUrl ? defangUrl(item) : item) ? (
                                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-sm font-bold uppercase text-[#475569]">
                  <Link2 className="w-4 h-4" />
                  <span>
                    {lang === 'hi' ? 'जुड़े केस' : 'Linked Cases'} ({record.linkedCases.length})
                  </span>
                </div>
                {record.linkedCases.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[#64748B]">
                    {lang === 'hi' ? 'कोई जुड़ा केस नहीं।' : 'None yet.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {record.linkedCases.map((match) => (
                      <div key={match.caseId} className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#0F172A]">{match.caseId}</span>
                          <RiskBadge level={match.riskLevel} size="sm" />
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-[#0F172A]">{match.title}</div>
                        {onOpenLinkedCase && (
                          <button
                            type="button"
                            onClick={() => onOpenLinkedCase(match.caseId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                          >
                            Open
                            <Download className="w-3 h-3 rotate-[-90deg]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
