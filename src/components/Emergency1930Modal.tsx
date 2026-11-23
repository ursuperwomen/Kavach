import { CheckSquare, PhoneCall, ShieldAlert, Square, X } from 'lucide-react';
import { useState } from 'react';
import { UI_COPY } from '../data/translations';
import type { AppLanguage } from '../types/forensics';

interface Emergency1930ModalProps {
  lang: AppLanguage;
  onClose: () => void;
}

export function Emergency1930Modal({ lang, onClose }: Emergency1930ModalProps) {
  const t = UI_COPY[lang];
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const steps = [t.emergencyStep1, t.emergencyStep2, t.emergencyStep3];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/65 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
    >
      <div className="card-elevated w-full max-w-lg max-h-[92dvh] flex flex-col rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 bg-[#DC2626] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h2 id="emergency-title" className="text-[17px] sm:text-[19px] font-extrabold truncate">
              {lang === 'hi' ? 'हेल्पलाइन 1930 — तुरंत कदम' : 'Emergency 1930'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/90 hover:bg-white/15 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 bg-white overflow-y-auto">
          <p className="text-sm font-semibold text-[#334155]">{t.emergencyBannerTitle}</p>

          <div className="space-y-2.5">
            {steps.map((step, idx) => {
              const done = checkedSteps.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleStep(idx)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-lg border ${
                    done
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
                  }`}
                >
                  {done ? (
                    <CheckSquare className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#475569] shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm sm:text-[15px] leading-snug font-medium">
                    <strong className="mr-1">{idx + 1}.</strong>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <a
              href="tel:1930"
              className="flex-1 min-h-[48px] px-5 py-2.5 rounded-lg bg-[#DC2626] text-white font-bold text-sm sm:text-base hover:bg-[#B91C1C] inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              {lang === 'hi' ? '1930 पर कॉल करें' : 'Call 1930'}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 rounded-lg bg-[#0F172A] text-white font-semibold text-sm hover:bg-[#1E293B]"
            >
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
