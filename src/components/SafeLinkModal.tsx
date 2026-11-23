import { AlertTriangle, ShieldAlert, X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { RiskLevel } from '../types/forensics';
import { defangUrl } from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface SafeLinkModalProps {
  url: string;
  riskLevel: RiskLevel;
  reasons: string[];
  lookAlikeTarget?: string;
  onClose: () => void;
}

export function SafeLinkModal({
  url,
  riskLevel,
  reasons,
  lookAlikeTarget,
  onClose,
}: SafeLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyDefanged = () => {
    navigator.clipboard?.writeText(defangUrl(url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDangerous = riskLevel !== 'LOW';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safe-link-title"
    >
      <div className="card-elevated w-full max-w-xl rounded-lg p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                isDangerous ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F0FDF4] text-[#16A34A]'
              }`}
            >
              {isDangerous ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h2 id="safe-link-title" className="text-xl font-bold text-[#0F172A]">
                {isDangerous ? 'Stop — Risky Link Intercepted' : 'External Link Verification'}
              </h2>
              <div className="mt-1">
                <RiskBadge level={riskLevel} size="sm" />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Close warning dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-[18px] leading-[28px] text-[#334155]">
            {isDangerous
              ? 'This destination triggered fraud and phishing warnings. Opening it may expose your banking credentials, OTPs, or prompt a malicious APK download.'
              : 'This link passed static verification checks. Still confirm the domain spelling carefully before entering any password or OTP.'}
          </p>

          <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#475569]">
                Defanged Destination URL
              </span>
              <button
                type="button"
                onClick={handleCopyDefanged}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Safely' : 'Copy Defanged'}
              </button>
            </div>
            <p className="font-mono text-sm text-[#0F172A] break-all">{defangUrl(url)}</p>
            {lookAlikeTarget && (
              <p className="mt-2 text-sm font-semibold text-[#991B1B]">
                Impersonation Warning: Mimics official {lookAlikeTarget}
              </p>
            )}
          </div>

          {reasons.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-[#475569] mb-2">
                Why This Link Was Flagged
              </h3>
              <ul className="space-y-1.5 text-[16px] text-[#334155]">
                {reasons.slice(0, 4).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] px-6 py-3 rounded-lg bg-[#0F172A] text-white font-semibold text-[16px] hover:bg-[#1E293B] whitespace-nowrap"
          >
            Return to Safety
          </button>
          <p className="text-sm text-[#475569]">
            Direct navigation is blocked inside the portal to protect citizens and officers.
          </p>
        </div>
      </div>
    </div>
  );
}
