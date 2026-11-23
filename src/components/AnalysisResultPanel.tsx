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
import { useRef, useState } from 'react';
import { UI_COPY } from '../data/translations';
import type { AppLanguage, CaseRecord } from '../types/forensics';
import {
  defangUrl,
  downloadHtmlEvidenceReport,
  downloadJsonEvidenceBundle,
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);

  // Audio playback (Gemini 3.8 TTS)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Build crisp WhatsApp warning text for family/friends
  const primaryLink = record.identifiers.urls[0] || record.identifiers.domains[0];
  const whatsappMessage =
    lang === 'hi'
      ? `🛡️ *कवच (Kavach) सुरक्षा रिपोर्ट*\n\nनतीजा: *${
          record.riskLevel === 'HIGH'
            ? '🔴 खतरा — यह स्कैम / नकली है'
            : record.riskLevel === 'MEDIUM'
            ? '🟡 सावधान — यह संदिग्ध है'
            : '🟢 सुरक्षित लगता है'
        }*\nविषय: ${record.title}${
          primaryLink ? `\nलिंक (क्लिक न करें): ${defangUrl(primaryLink)}` : ''
        }\nसलाह: ${
          record.aiBrief?.citizenWarning ||
          'कृपया इस लिंक पर क्लिक न करें और किसी को OTP या पैसे न भेजें।'
        }\n\nकेस नंबर: ${record.caseId} | साइबर हेल्पलाइन: 1930`
      : `🛡️ *Kavach Cyber Safety Alert*\n\nResult: *${
          record.riskLevel === 'HIGH'
            ? '🔴 DANGER — SCAM / FAKE'
            : record.riskLevel === 'MEDIUM'
            ? '🟡 BE CAREFUL — SUSPICIOUS'
            : '🟢 LOOKS SAFE'
        }*\nItem: ${record.title}${
          primaryLink ? `\nLink (DO NOT OPEN): ${defangUrl(primaryLink)}` : ''
        }\nAdvice: ${
          record.aiBrief?.citizenWarning ||
          'Do not open this link, do not share any OTP, and never send money to unknown UPI IDs.'
        }\n\nCase ID: ${record.caseId} | Cyber Helpline: 1930`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard?.writeText(whatsappMessage);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  const handleListenVerdict = async () => {
    setAudioError(null);
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingAudio(false);
      return;
    }

    const spokenText =
      lang === 'hi'
        ? `${
            record.riskLevel === 'HIGH'
              ? 'सावधान! यह एक खतरनाक स्कैम या नकली लिंक है।'
              : record.riskLevel === 'MEDIUM'
              ? 'ध्यान दें! यह संदेश संदिग्ध लग रहा है।'
              : 'अच्छी खबर! यह सुरक्षित लगता है।'
          } ${record.aiBrief?.whatIsThisLink || ''} ${
            record.aiBrief?.citizenWarning ||
            (record.riskLevel === 'HIGH'
              ? 'इस लिंक पर क्लिक न करें, किसी को ओटीपी न बताएं और कोई पैसा न भेजें। मदद के लिए 1930 पर कॉल करें।'
              : 'आगे बढ़ने से पहले आधिकारिक वेबसाइट से जांच जरूर करें।')
          }`
        : `${
            record.riskLevel === 'HIGH'
              ? 'Warning! This is a high risk scam or fake link.'
              : record.riskLevel === 'MEDIUM'
              ? 'Be careful! This looks suspicious.'
              : 'Good news! This looks safe.'
          } ${record.aiBrief?.whatIsThisLink || ''} ${
            record.aiBrief?.citizenWarning ||
            (record.riskLevel === 'HIGH'
              ? 'Do not click the link, do not share any OTP, and do not send money. Call 1930 if you need help.'
              : 'Always double-check before sharing personal details.')
          }`;

    setIsPlayingAudio(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, lang }),
      });
      const data = await res.json();
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'Could not generate audio.');
      }
      const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
        setAudioError(lang === 'hi' ? 'ऑडियो चलाने में समस्या आई।' : 'Could not play audio clip.');
      };
      await audio.play();
    } catch (err) {
      setIsPlayingAudio(false);
      setAudioError(
        err instanceof Error
          ? err.message
          : lang === 'hi'
          ? 'आवाज़ चलाने में दिक्कत आई।'
          : 'Audio playback unavailable.'
      );
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
      if (!res.ok || !data.caseRecord) {
        throw new Error(data.error || 'Could not file police report.');
      }
      onCaseUpdated?.(data.caseRecord as CaseRecord);
    } catch (err) {
      setPoliceError(err instanceof Error ? err.message : 'Unable to submit report.');
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
        ? `यह नकली लिंक है जो असली ${record.technical.lookAlikeTarget} की नकल कर रहा है।`
        : record.riskLevel === 'HIGH'
        ? `यह "${record.threatCategory}" से जुड़ा एक खतरनाक स्कैम है।`
        : record.riskLevel === 'MEDIUM'
        ? `यह एक संदिग्ध संदेश या लिंक है — बिना जांचे भरोसा न करें।`
        : `यह सामान्य और सुरक्षित संदेश/लिंक प्रतीत होता है।`
      : record.technical.lookAlikeTarget
      ? `Fake copycat pretending to be official ${record.technical.lookAlikeTarget}.`
      : record.riskLevel === 'HIGH'
      ? `Fraudulent ${record.threatCategory} attempt designed to steal money or data.`
      : record.riskLevel === 'MEDIUM'
      ? `Suspicious item requiring independent verification before trusting.`
      : `Appears legitimate with no scam patterns detected.`;

  const identifierGroups: Array<{
    key: string;
    label: string;
    items: string[];
    isUrl?: boolean;
  }> = [
    { key: 'domains', label: lang === 'hi' ? 'वेबसाइट / डोमेन' : 'Domains', items: record.identifiers.domains },
    { key: 'urls', label: lang === 'hi' ? 'लिंक (सुरक्षित रूप में)' : 'URLs (Defanged)', items: record.identifiers.urls, isUrl: true },
    { key: 'phones', label: lang === 'hi' ? 'फोन नंबर' : 'Phone Numbers', items: record.identifiers.phoneNumbers },
    { key: 'upis', label: lang === 'hi' ? 'UPI ID' : 'UPI Payment IDs', items: record.identifiers.upiIds },
    { key: 'banks', label: lang === 'hi' ? 'बैंक खाता नंबर' : 'Bank Accounts', items: record.identifiers.bankAccounts },
    { key: 'ifsc', label: 'IFSC', items: record.identifiers.ifscCodes },
    { key: 'crypto', label: 'Crypto Wallets', items: record.identifiers.cryptoWallets },
    { key: 'packages', label: 'Android Apps', items: record.identifiers.packageNames },
    { key: 'ips', label: 'IP Addresses', items: record.identifiers.ipAddresses },
    { key: 'emails', label: 'Emails', items: record.identifiers.emails },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* 1. CRYSTAL-CLEAR VERDICT CARD (Designed for 10-year-olds & 50-year-olds) */}
      <section className="card-resting rounded-lg p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#475569]">
            <span className="font-mono font-bold text-[#0F172A]">{record.caseId}</span>
            <span aria-hidden="true">·</span>
            <span>{record.channel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatTimestamp(record.createdAt)}</span>
          </div>
          <RiskBadge level={record.riskLevel} score={record.riskScore} />
        </div>

        {/* High-Visibility Verdict Box */}
        <div className={`rounded-lg border p-4 sm:p-6 space-y-3 ${bannerStyles}`}>
          <div className="flex items-start gap-3">
            {record.riskLevel === 'LOW' ? (
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1 min-w-0">
              <h2 className="text-[20px] sm:text-[26px] md:text-[28px] font-extrabold leading-tight">
                {bigVerdictText}
              </h2>

              <div className="text-[16px] sm:text-[18px] leading-[25px] sm:leading-[28px] font-semibold text-[#0F172A]">
                <span className="text-xs sm:text-sm uppercase tracking-[0.05em] text-[#475569] block mb-0.5">
                  {t.whatIsItLabel}
                </span>
                {record.aiBrief?.whatIsThisLink || fallbackWhatIsIt}
              </div>

              <p className="text-[16px] sm:text-[18px] leading-[25px] sm:leading-[28px] text-[#0F172A]">
                {record.aiBrief?.citizenWarning ||
                  (record.riskLevel === 'HIGH'
                    ? lang === 'hi'
                      ? 'इस लिंक पर क्लिक न करें, किसी को OTP न बताएं और कोई पैसा न भेजें। यदि पैसा कट गया हो तो तुरंत 1930 पर कॉल करें।'
                      : 'Do not click the link, do not share any OTP, and never send money. Call 1930 immediately if money was deducted.'
                    : record.riskLevel === 'MEDIUM'
                    ? lang === 'hi'
                      ? 'यह संदिग्ध लगता है। आगे बढ़ने से पहले आधिकारिक वेबसाइट या बैंक से खुद पुष्टि करें।'
                      : 'This looks suspicious. Verify independently with the official organization before acting.'
                    : lang === 'hi'
                    ? 'कोई बड़ा खतरा नहीं मिला, फिर भी अपना OTP और PIN हमेशा गुप्त रखें।'
                    : 'No immediate threat found, though you should always keep your OTP and PIN private.')}
              </p>
            </div>
          </div>
        </div>

        {/* 3 BIG ONE-TAP CITIZEN ACTION BUTTONS: Listen Audio | Share on WhatsApp | Report to Police */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleListenVerdict}
            className="min-h-[52px] sm:min-h-[56px] px-4 py-3 rounded-lg bg-[#0F172A] text-white text-[15px] sm:text-[16px] font-bold hover:bg-[#1E293B] inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-4 h-4 fill-current shrink-0" />
                <span>{t.listeningBtn}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 shrink-0" />
                <span>{t.listenBtn}</span>
              </>
            )}
          </button>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[52px] sm:min-h-[56px] px-4 py-3 rounded-lg bg-[#16A34A] text-white text-[15px] sm:text-[16px] font-bold hover:bg-[#15803D] inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Share2 className="w-5 h-5 shrink-0" />
            <span>{t.shareWaBtn}</span>
          </a>

          <button
            type="button"
            onClick={() =>
              policeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            className="min-h-[52px] sm:min-h-[56px] px-4 py-3 rounded-lg bg-[#DC2626] text-white text-[15px] sm:text-[16px] font-bold hover:bg-[#B91C1C] inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Siren className="w-5 h-5 shrink-0" />
            <span>{lang === 'hi' ? 'पुलिस को रिपोर्ट करें' : 'Report to Police'}</span>
          </button>
        </div>

        {/* Secondary Copy WhatsApp + Emergency 1930 Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            {waCopied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
            {waCopied ? t.copiedWaBtn : t.copyWaBtn}
          </button>

          {record.riskLevel !== 'LOW' && onOpenEmergency && (
            <button
              type="button"
              onClick={onOpenEmergency}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:underline"
            >
              <PhoneCall className="w-4 h-4" />
              {lang === 'hi'
                ? 'पैसे कट गए? तुरंत 1930 इमरजेंसी कदम देखें'
                : 'Lost money? Open 1930 Emergency Steps'}
            </button>
          )}
        </div>

        {audioError && (
          <div className="rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}

        {/* Simple 3-Step "What To Do Now" */}
        {record.aiBrief?.recommendedActions && record.aiBrief.recommendedActions.length > 0 && (
          <div className="pt-5 border-t border-[#F1F5F9] space-y-3">
            <h3 className="text-[18px] font-bold text-[#0F172A]">{t.whatToDoLabel}</h3>
            <ol className="space-y-2.5 text-[17px] leading-[27px] text-[#0F172A]">
              {record.aiBrief.recommendedActions.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0F172A] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {record.aiError && (
          <div className="rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{record.aiError}</span>
          </div>
        )}
      </section>

      {/* 2. REPORT TO CYBER POLICE CARD (Directly Below Verdict) */}
      <section ref={policeFormRef} className="card-resting rounded-lg p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
              <Siren className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[22px] font-bold text-[#0F172A]">{t.reportPoliceTitle}</h3>
              <p className="text-[16px] text-[#475569]">{t.reportPoliceSub}</p>
            </div>
          </div>
          <a
            href="tel:1930"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-bold text-sm whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            1930 Helpline
          </a>
        </div>

        {record.policeReport ? (
          <div className="rounded-lg border border-[#86EFAC] bg-[#F0FDF4] p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-[#166534] font-bold text-[18px]">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'साइबर पुलिस में शिकायत दर्ज हो गई है!'
                  : 'Report Filed to Cyber Police Triage!'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2">
              <div>
                <span className="text-[#475569] block">
                  {lang === 'hi' ? 'शिकायत नंबर' : 'Complaint Number'}
                </span>
                <span className="font-mono font-bold text-[#0F172A] text-base">
                  {record.policeReport.complaintNumber}
                </span>
              </div>
              <div>
                <span className="text-[#475569] block">
                  {lang === 'hi' ? 'शहर / स्थान' : 'City / Location'}
                </span>
                <span className="font-semibold text-[#0F172A]">{record.policeReport.city}</span>
              </div>
              <div>
                <span className="text-[#475569] block">
                  {lang === 'hi' ? 'स्थिति' : 'Status'}
                </span>
                <span className="font-semibold text-[#166534]">{record.policeReport.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadHtmlEvidenceReport(record)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B]"
              >
                <FileText className="w-4 h-4" />
                {lang === 'hi' ? 'पुलिस सबूत रिपोर्ट डाउनलोड करें' : 'Download Police Evidence Sheet'}
              </button>
              <button
                type="button"
                onClick={() => downloadJsonEvidenceBundle(record)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold hover:bg-[#F8FAFC]"
              >
                <FileJson className="w-4 h-4" />
                JSON Bundle
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPoliceReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="police-city"
                  className="block text-[15px] font-semibold text-[#0F172A] mb-1.5"
                >
                  {lang === 'hi' ? 'आपका शहर / राज्य' : 'Your City / State'}
                </label>
                <input
                  id="police-city"
                  type="text"
                  value={policeCity}
                  onChange={(e) => setPoliceCity(e.target.value)}
                  placeholder={lang === 'hi' ? 'जैसे: दिल्ली, जयपुर, मुंबई' : 'e.g. Bengaluru, Delhi, Pune'}
                  className="w-full min-h-[52px] px-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[16px] text-[#0F172A]"
                />
              </div>

              <div>
                <label
                  htmlFor="police-name"
                  className="block text-[15px] font-semibold text-[#0F172A] mb-1.5"
                >
                  {lang === 'hi' ? 'आपका नाम (वैकल्पिक — गुप्त रख सकते हैं)' : 'Your Name (Optional — Can Stay Anonymous)'}
                </label>
                <input
                  id="police-name"
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder={lang === 'hi' ? 'खाली छोड़ें यदि नाम नहीं देना' : 'Leave blank to stay anonymous'}
                  className="w-full min-h-[52px] px-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[16px] text-[#0F172A]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-3 min-h-[52px] px-4 py-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={moneyLost}
                  onChange={(e) => setMoneyLost(e.target.checked)}
                  className="w-5 h-5 accent-[#DC2626]"
                />
                <span className="text-[16px] font-semibold text-[#0F172A]">
                  {lang === 'hi' ? 'हाँ, मेरे पैसे कट गए हैं' : 'Yes, money was deducted / lost'}
                </span>
              </label>

              {moneyLost && (
                <input
                  type="text"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  placeholder={lang === 'hi' ? 'कितने रुपये कटे? (₹)' : 'Amount lost in ₹ (e.g. 5000)'}
                  className="flex-1 min-h-[52px] px-4 rounded-lg bg-white border-[1.5px] border-[#DC2626] text-[16px] text-[#0F172A]"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="police-extra"
                className="block text-[15px] font-semibold text-[#0F172A] mb-1.5"
              >
                {lang === 'hi'
                  ? 'अन्य जानकारी / UTR नंबर (यदि हो तो)'
                  : 'Additional Details / Bank UTR Number (Optional)'}
              </label>
              <input
                id="police-extra"
                type="text"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder={
                  lang === 'hi'
                    ? 'कोई कॉल नंबर, बैंक या UTR जानकारी लिखें...'
                    : 'Any caller number, bank name, or transaction UTR...'
                }
                className="w-full min-h-[52px] px-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[16px] text-[#0F172A]"
              />
            </div>

            {policeError && (
              <p className="text-sm font-semibold text-[#991B1B]">{policeError}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isFilingPolice}
                className="min-h-[56px] px-7 py-3 rounded-lg bg-[#DC2626] text-white text-[17px] font-bold hover:bg-[#B91C1C] disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
              >
                {isFilingPolice ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Siren className="w-5 h-5" />
                )}
                {t.reportPoliceBtn}
              </button>

              <button
                type="button"
                onClick={() => downloadHtmlEvidenceReport(record)}
                className="min-h-[56px] px-5 py-3 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-[15px] font-semibold hover:bg-[#F1F5F9] inline-flex items-center gap-2 whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                {lang === 'hi' ? 'रिपोर्ट डाउनलोड करें' : 'Download Evidence (HTML)'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[56px] px-4 py-3 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-[15px] font-semibold hover:bg-[#F1F5F9] inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 3. COLLAPSIBLE FORENSIC & INVESTIGATOR DETAILS (Clean for elders, deep for police) */}
      <div className="card-resting rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((v) => !v)}
          className="w-full px-6 md:px-8 py-5 flex items-center justify-between gap-4 text-left bg-white hover:bg-[#F8FAFC]"
        >
          <div>
            <h3 className="text-[20px] font-bold text-[#0F172A]">
              {t.whyFlaggedLabel} ({record.indicators.length}) &amp;{' '}
              {lang === 'hi' ? 'जांच सबूत' : 'Extracted Identifiers'}
            </h3>
            <p className="text-sm text-[#475569] mt-0.5">
              {lang === 'hi'
                ? 'लिंक, फोन नंबर, UPI ID, APK परमिशन और जुड़े हुए अन्य केस देखें'
                : 'Full risk indicators, defanged URLs, phone numbers, UPI IDs, APK permissions & linked cases'}
            </p>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-5 h-5 text-[#0F172A] shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#0F172A] shrink-0" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="px-6 md:px-8 pb-8 pt-2 space-y-8 border-t border-[#E2E8F0]">
            {/* Explainable Indicators */}
            <div className="divide-y divide-[#F1F5F9]">
              {record.indicators.map((ind) => (
                <div
                  key={ind.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#475569]">
                      <span className="font-mono">{ind.id}</span> · {ind.category}
                    </div>
                    <h4 className="text-[17px] font-semibold text-[#0F172A]">{ind.title}</h4>
                    <p className="text-[15px] leading-[24px] text-[#334155]">{ind.explanation}</p>
                    {ind.evidenceSnippet && (
                      <p className="inline-block mt-1 font-mono text-xs text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1 break-all">
                        {ind.evidenceSnippet}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <RiskBadge level={ind.severity} size="sm" />
                  </div>
                </div>
              ))}
            </div>

            {/* APK Audit (if present) */}
            {record.technical.apkInfo && (
              <div className="pt-4 border-t border-[#E2E8F0] space-y-4">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-[#0F172A]" />
                  <h4 className="text-[18px] font-bold text-[#0F172A]">
                    Android APK Static Audit — {record.technical.apkInfo.packageName}
                  </h4>
                </div>
                {record.technical.apkInfo.dangerousPermissions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {record.technical.apkInfo.dangerousPermissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-center justify-between gap-2 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2"
                      >
                        <span className="font-mono text-xs font-semibold text-[#991B1B] break-all">
                          {perm}
                        </span>
                        <span className="text-xs font-bold text-[#DC2626] shrink-0">HIGH</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extracted Identifiers + Linked Cases */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-[#E2E8F0]">
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-[18px] font-bold text-[#0F172A]">
                  {lang === 'hi' ? 'निकाले गए सबूत (लिंक, फोन, UPI)' : 'Extracted Identifiers (IOCs)'}
                </h4>
                {identifierGroups.length === 0 ? (
                  <p className="text-sm text-[#475569]">
                    {lang === 'hi' ? 'कोई बाहरी लिंक या UPI नहीं मिला।' : 'No external identifiers extracted.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {identifierGroups.map((group) => (
                      <div key={group.key}>
                        <div className="text-xs font-bold uppercase tracking-[0.06em] text-[#475569] mb-1.5">
                          {group.label}
                        </div>
                        <div className="space-y-1.5">
                          {group.items.map((item) => (
                            <div
                              key={item}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2"
                            >
                              <span className="font-mono text-xs sm:text-sm font-medium text-[#0F172A] break-all">
                                {group.isUrl ? defangUrl(item) : item}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                {group.isUrl && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectUrl(item, record)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC2626] hover:underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Safe Check
                                  </button>
                                )}
                                {onPivotIdentifier && (
                                  <button
                                    type="button"
                                    onClick={() => onPivotIdentifier(item)}
                                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                                  >
                                    Cases
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(group.isUrl ? defangUrl(item) : item)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
                                >
                                  {copiedId === (group.isUrl ? defangUrl(item) : item) ? (
                                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  Copy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-[#0F172A]" />
                  <h4 className="text-[18px] font-bold text-[#0F172A]">
                    {lang === 'hi' ? 'जुड़े हुए अन्य केस' : 'Cross-Linked Cases'} ({record.linkedCases.length})
                  </h4>
                </div>
                {record.linkedCases.length === 0 ? (
                  <p className="text-sm text-[#475569]">
                    {lang === 'hi'
                      ? 'अभी तक किसी अन्य केस से समान लिंक/UPI नहीं मिला।'
                      : 'No prior linked cases found yet.'}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {record.linkedCases.map((match) => (
                      <div
                        key={match.caseId}
                        className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#0F172A]">
                            {match.caseId}
                          </span>
                          <RiskBadge level={match.riskLevel} size="sm" />
                        </div>
                        <div className="text-sm font-semibold text-[#0F172A]">{match.title}</div>
                        {match.sharedIdentifiers.length > 0 && (
                          <div className="font-mono text-xs text-[#991B1B]">
                            Shared: {match.sharedIdentifiers.join(' · ')}
                          </div>
                        )}
                        {onOpenLinkedCase && (
                          <button
                            type="button"
                            onClick={() => onOpenLinkedCase(match.caseId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                          >
                            Open Case
                            <Download className="w-3 h-3 rotate-[-90deg]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {record.aiBrief?.investigatorNotes && (
                  <div className="pt-3 border-t border-[#E2E8F0] text-sm text-[#334155]">
                    <div className="text-xs font-bold uppercase tracking-[0.06em] text-[#475569] mb-1">
                      LEA Triage Note
                    </div>
                    <p>{record.aiBrief.investigatorNotes}</p>
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
