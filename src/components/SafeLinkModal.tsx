import { AlertTriangle, Check, Copy, ShieldAlert, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safe-link-title"
    >
      <div className="card-elevated w-full max-w-lg max-h-[92dvh] flex flex-col rounded-lg overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isDangerous ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F0FDF4] text-[#16A34A]'
              }`}
            >
              {isDangerous ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="safe-link-title" className="text-base sm:text-lg font-bold text-[#0F172A] truncate">
                {isDangerous ? 'Risky Link Blocked' : 'Link Verified'}
              </h2>
              <RiskBadge level={riskLevel} size="sm" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#475569] hover:bg-[#F1F5F9] shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase text-[#475569]">Defanged URL</span>
              <button
                type="button"
                onClick={handleCopyDefanged}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs sm:text-sm text-[#0F172A] break-all">{defangUrl(url)}</p>
            {lookAlikeTarget && (
              <p className="text-xs font-semibold text-[#991B1B]">Mimics {lookAlikeTarget}</p>
            )}
          </div>

          {reasons.length > 0 && (
            <ul className="space-y-1.5 text-sm text-[#334155]">
              {reasons.slice(0, 4).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] px-5 py-2.5 rounded-lg bg-[#0F172A] text-white font-semibold text-sm hover:bg-[#1E293B]"
          >
            Back to Safety
          </button>
        </div>
      </div>
    </div>
  );
}
