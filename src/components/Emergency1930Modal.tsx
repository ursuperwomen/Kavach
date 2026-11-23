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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
    >
      <div className="card-elevated w-full max-w-xl rounded-lg overflow-hidden">
        <div className="px-6 py-5 bg-[#DC2626] text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-7 h-7 shrink-0 mt-0.5" />
            <div>
              <h2 id="emergency-title" className="text-[20px] font-extrabold leading-snug">
                {lang === 'hi' ? 'साइबर इमरजेंसी मदद (हेल्पलाइन 1930)' : 'Cyber Emergency Help (Helpline 1930)'}
              </h2>
              <p className="text-sm text-white/90 mt-1">{t.emergencyBannerTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-white/90 hover:bg-white/15"
            aria-label="Close emergency help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const done = checkedSteps.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleStep(idx)}
                  className={`w-full text-left flex items-start gap-3.5 p-4 rounded-lg border ${
                    done
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
                  }`}
                >
                  {done ? (
                    <CheckSquare className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-6 h-6 text-[#475569] shrink-0 mt-0.5" />
                  )}
                  <span className="text-[17px] leading-[26px] font-medium">
                    <strong className="mr-1.5">{idx + 1}.</strong>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.06em] text-[#475569]">
                {lang === 'hi' ? 'राष्ट्रीय साइबर अपराध हेल्पलाइन' : 'National Cybercrime Helpline'}
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums mt-0.5">
                1930 · cybercrime.gov.in
              </div>
            </div>
            <a
              href="tel:1930"
              className="min-h-[52px] px-6 py-3 rounded-lg bg-[#DC2626] text-white font-bold text-[16px] hover:bg-[#B91C1C] inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <PhoneCall className="w-5 h-5" />
              {lang === 'hi' ? '1930 पर कॉल करें' : 'Call 1930 Now'}
            </a>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-6 rounded-lg bg-[#0F172A] text-white font-semibold text-sm hover:bg-[#1E293B]"
            >
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
