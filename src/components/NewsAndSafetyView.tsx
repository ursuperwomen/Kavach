import { CheckCircle2, Share2, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { SPOT_THE_SCAM_QUIZ, TRENDING_SCAM_NEWS, UI_COPY } from '../data/translations';
import type { AppLanguage } from '../types/forensics';
import { defangUrl } from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface NewsAndSafetyViewProps {
  lang: AppLanguage;
  onQuickCheckText: (text: string, url?: string) => void;
}

export function NewsAndSafetyView({ lang, onQuickCheckText }: NewsAndSafetyViewProps) {
  const t = UI_COPY[lang];
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const buildWhatsappAlertHref = (title: string, summary: string, link?: string) => {
    const msg =
      lang === 'hi'
        ? `⚠️ कवच अलर्ट: ${title}\n${summary}${link ? `\nलिंक: ${defangUrl(link)}` : ''}\nहेल्पलाइन: 1930`
        : `⚠️ Kavach Alert: ${title}\n${summary}${link ? `\nLink: ${defangUrl(link)}` : ''}\nHelpline: 1930`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-[22px] sm:text-[30px] md:text-[34px] font-extrabold tracking-[-0.02em] text-[#0F172A] leading-tight">
        {t.trendingHeading}
      </h1>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRENDING_SCAM_NEWS.map((news) => (
          <article key={news.id} className="card-resting rounded-lg p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#475569]">
                  {lang === 'hi' ? news.tagHi : news.tagEn} · {news.date}
                </span>
                <RiskBadge level={news.severity} size="sm" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                {lang === 'hi' ? news.titleHi : news.titleEn}
              </h2>
              <p className="text-sm text-[#334155]">
                {lang === 'hi' ? news.summaryHi : news.summaryEn}
              </p>
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onQuickCheckText(news.sampleTriggerText, news.sampleUrl)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-semibold hover:bg-[#1E293B] whitespace-nowrap"
              >
                {t.checkThisBtn}
              </button>
              <a
                href={buildWhatsappAlertHref(
                  lang === 'hi' ? news.titleHi : news.titleEn,
                  lang === 'hi' ? news.summaryHi : news.summaryEn,
                  news.sampleUrl
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs sm:text-sm font-semibold hover:bg-[#15803D] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t.shareWaBtn}
              </a>
            </div>
          </article>
        ))}
      </section>

      {/* Spot Real vs Fake Quiz */}
      <section className="card-resting rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#0F172A] shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
            {lang === 'hi' ? 'असली या नकली पहचानें' : 'Spot Real vs Fake'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SPOT_THE_SCAM_QUIZ.map((item) => {
            const chosen = answers[item.id];
            const answered = chosen !== undefined;
            const correct = answered && chosen === item.isScam;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3"
              >
                <p className="text-sm sm:text-[15px] font-medium text-[#0F172A] leading-snug">
                  {lang === 'hi' ? item.promptHi : item.promptEn}
                </p>

                {!answered ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: true }))}
                      className="min-h-[42px] rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-bold text-xs sm:text-sm"
                    >
                      {lang === 'hi' ? 'स्कैम' : 'SCAM'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: false }))}
                      className="min-h-[42px] rounded-lg bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-xs sm:text-sm"
                    >
                      {lang === 'hi' ? 'असली' : 'REAL'}
                    </button>
                  </div>
                ) : (
                  <div
                    className={`rounded-md border p-3 text-xs sm:text-sm space-y-1 ${
                      correct
                        ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                        : 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {correct ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                      <span>{correct ? (lang === 'hi' ? 'सही!' : 'Correct!') : lang === 'hi' ? 'ध्यान दें:' : 'Note:'}</span>
                    </div>
                    <p>{lang === 'hi' ? item.explainHi : item.explainEn}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
