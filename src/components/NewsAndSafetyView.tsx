import { CheckCircle2, Flame, Newspaper, Share2, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { SPOT_THE_SCAM_QUIZ, TRENDING_SCAM_NEWS, UI_COPY } from '../data/translations';
import type { AppLanguage, HeatListItem } from '../types/forensics';
import { defangUrl } from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface NewsAndSafetyViewProps {
  lang: AppLanguage;
  onLangChange: (lang: AppLanguage) => void;
  heatItems: HeatListItem[];
  onQuickCheckText: (text: string, url?: string) => void;
}

export function NewsAndSafetyView({
  lang,
  onLangChange,
  heatItems,
  onQuickCheckText,
}: NewsAndSafetyViewProps) {
  const t = UI_COPY[lang];
  const [filter, setFilter] = useState<'all' | 'domain' | 'upi' | 'phone' | 'package'>('all');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const filteredTrending =
    filter === 'all' ? heatItems : heatItems.filter((item) => item.type === filter);

  const buildWhatsappAlertHref = (title: string, summary: string, link?: string) => {
    const msg =
      lang === 'hi'
        ? `⚠️ *कवच (Kavach) ट्रेंडिंग स्कैम चेतावनी*\n\n*सावधान:* ${title}\n${summary}${
            link ? `\nखतरनाक लिंक (क्लिक न करें): ${defangUrl(link)}` : ''
          }\n\nपरिवार को सुरक्षित रखें। किसी भी धोखाधड़ी पर 1930 पर कॉल करें।`
        : `⚠️ *Kavach Trending Scam Alert*\n\n*Warning:* ${title}\n${summary}${
            link ? `\nSuspicious link (DO NOT CLICK): ${defangUrl(link)}` : ''
          }\n\nStay safe & warn your family! Call 1930 for cyber fraud help.`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const typeLabel = (type: HeatListItem['type']) => {
    if (lang === 'hi') {
      if (type === 'domain') return 'नकली वेबसाइट';
      if (type === 'upi') return 'फर्जी UPI ID';
      if (type === 'phone') return 'ठग फोन नंबर';
      if (type === 'package') return 'खतरनाक ऐप (APK)';
      return 'क्रिप्टो वॉलेट';
    }
    if (type === 'domain') return 'Fake Website';
    if (type === 'upi') return 'Scam UPI ID';
    if (type === 'phone') return 'Scam Phone';
    if (type === 'package') return 'Fake App (APK)';
    return 'Crypto Wallet';
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.06em] text-[#DC2626]">
            {lang === 'hi' ? 'लाइव ट्रेंडिंग स्कैम और ताज़ा खबरें' : 'Live Trending Scams & Public Alerts'}
          </p>
          <h1 className="text-[24px] sm:text-[30px] md:text-[38px] font-extrabold tracking-[-0.02em] text-[#0F172A] mt-1 leading-tight">
            {t.trendingHeading}
          </h1>
          <p className="text-[15px] sm:text-[18px] text-[#475569] mt-1">{t.trendingSub}</p>
        </div>

        <div
          className="inline-flex items-center p-1 bg-white border border-[#CBD5E1] rounded-lg shrink-0 self-start"
          role="group"
          aria-label="Language switch"
        >
          <button
            type="button"
            onClick={() => onLangChange('hi')}
            className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'hi' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'en' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Live Trending Dangerous Links, Numbers, UPIs & Fake Apps */}
      <section className="card-resting rounded-lg p-4 sm:p-6 md:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-[#DC2626] shrink-0" />
            <div>
              <h2 className="text-[19px] sm:text-[22px] font-bold text-[#0F172A]">
                {lang === 'hi'
                  ? 'आज के सबसे खतरनाक ट्रेंडिंग लिंक, UPI व नंबर'
                  : 'Most Reported Scam Links, UPIs, Phones & Fake Apps'}
              </h2>
              <p className="text-sm text-[#475569]">
                {lang === 'hi'
                  ? 'परिवार को सावधान करने के लिए एक क्लिक में WhatsApp पर भेजें।'
                  : 'Tap Check to inspect any scam or tap WhatsApp to warn your family.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
            {(
              [
                { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                { id: 'domain', label: lang === 'hi' ? 'नकली लिंक' : 'Fake Links' },
                { id: 'upi', label: 'UPI ID' },
                { id: 'phone', label: lang === 'hi' ? 'फोन नंबर' : 'Phones' },
                { id: 'package', label: lang === 'hi' ? 'नकली ऐप' : 'Fake Apps' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrending.length === 0 ? (
            <p className="col-span-full text-[16px] text-[#475569] py-6 text-center">
              {lang === 'hi'
                ? 'इस श्रेणी में अभी कोई ट्रेंडिंग स्कैम नहीं है।'
                : 'No trending scams in this category yet.'}
            </p>
          ) : (
            filteredTrending.map((item) => (
              <div
                key={`${item.type}-${item.value}`}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#475569]">
                      {typeLabel(item.type)}
                    </span>
                    <RiskBadge level={item.riskLevel} size="sm" />
                  </div>
                  <div className="font-mono text-sm font-bold text-[#0F172A] break-all">
                    {item.type === 'domain' ? item.value.replace(/\./g, '[.]') : item.value}
                  </div>
                  <div className="text-xs text-[#475569] tabular-nums">
                    {item.reportCount} {lang === 'hi' ? 'बार रिपोर्ट हुआ' : 'reports'} ·{' '}
                    {item.associatedCategories[0]}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() =>
                      onQuickCheckText(
                        item.type === 'domain'
                          ? `http://${item.value}`
                          : `Suspicious scam report involving ${item.value}`,
                        item.type === 'domain' ? `http://${item.value}` : undefined
                      )
                    }
                    className="flex-1 py-2.5 px-3 rounded-md bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] whitespace-nowrap"
                  >
                    {t.checkThisBtn}
                  </button>
                  <a
                    href={buildWhatsappAlertHref(
                      item.value,
                      `${item.associatedCategories.join(', ')} (${item.reportCount} reports)`,
                      item.type === 'domain' ? `http://${item.value}` : undefined
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-md bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Cyber Fraud News Alerts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-6 h-6 text-[#0F172A]" />
          <h2 className="text-[22px] font-bold text-[#0F172A]">
            {lang === 'hi' ? 'ताज़ा साइबर ठगी खबरें और बचाव' : 'Latest Scam News & Public Warnings'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {TRENDING_SCAM_NEWS.map((news) => (
            <article key={news.id} className="card-resting rounded-lg p-4 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#475569]">
                    {lang === 'hi' ? news.tagHi : news.tagEn} · {news.date}
                  </span>
                  <RiskBadge level={news.severity} size="sm" />
                </div>
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#0F172A] leading-snug">
                  {lang === 'hi' ? news.titleHi : news.titleEn}
                </h3>
                <p className="text-[15px] sm:text-[16px] leading-[24px] sm:leading-[26px] text-[#334155]">
                  {lang === 'hi' ? news.summaryHi : news.summaryEn}
                </p>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => onQuickCheckText(news.sampleTriggerText, news.sampleUrl)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] whitespace-nowrap"
                >
                  {lang === 'hi' ? 'इस स्कैम को जांचें' : 'Check This Scam'}
                </button>
                <a
                  href={buildWhatsappAlertHref(
                    lang === 'hi' ? news.titleHi : news.titleEn,
                    lang === 'hi' ? news.summaryHi : news.summaryEn,
                    news.sampleUrl
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#15803D] inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  {t.shareWaBtn}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Kids & Elders 1-Minute "Spot the Scam" Practice Cards */}
      <section className="card-resting rounded-lg p-4 sm:p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
          <Sparkles className="w-6 h-6 text-[#0F172A] shrink-0" />
          <div>
            <h2 className="text-[19px] sm:text-[22px] font-bold text-[#0F172A]">
              {lang === 'hi'
                ? '1 मिनट में सीखें: असली या नकली पहचानें (बच्चों और बड़ों के लिए)'
                : '1-Minute Practice: Spot Real vs Fake (For Kids & Elders)'}
            </h2>
            <p className="text-[15px] text-[#475569]">
              {lang === 'hi'
                ? 'नीचे दिए मैसेज पढ़कर चुनें कि यह "असली" है या "स्कैम"।'
                : 'Tap Real or Scam on each message below to test your cyber instincts.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {SPOT_THE_SCAM_QUIZ.map((item) => {
            const chosen = answers[item.id];
            const answered = chosen !== undefined;
            const correct = answered && chosen === item.isScam;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 flex flex-col justify-between gap-4"
              >
                <p className="text-[16px] leading-[26px] font-medium text-[#0F172A]">
                  {lang === 'hi' ? item.promptHi : item.promptEn}
                </p>

                {!answered ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: true }))}
                      className="min-h-[48px] rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-bold text-sm hover:bg-[#FEE2E2]"
                    >
                      {lang === 'hi' ? 'स्कैम / नकली' : 'SCAM / FAKE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: false }))}
                      className="min-h-[48px] rounded-lg bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] font-bold text-sm hover:bg-[#DCFCE7]"
                    >
                      {lang === 'hi' ? 'असली / सुरक्षित' : 'REAL / SAFE'}
                    </button>
                  </div>
                ) : (
                  <div
                    className={`rounded-md border p-3.5 text-sm space-y-1.5 ${
                      correct
                        ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                        : 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {correct ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        {correct
                          ? lang === 'hi'
                            ? 'बिल्कुल सही जवाब!'
                            : 'Spot On!'
                          : lang === 'hi'
                          ? 'ध्यान दें:'
                          : 'Good to know:'}
                      </span>
                    </div>
                    <p className="leading-relaxed">
                      {lang === 'hi' ? item.explainHi : item.explainEn}
                    </p>
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
