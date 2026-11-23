import { Menu, PhoneCall, Shield, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CommunityWallView } from './components/CommunityWallView';
import { Emergency1930Modal } from './components/Emergency1930Modal';
import { NewsAndSafetyView } from './components/NewsAndSafetyView';
import { SafeLinkModal } from './components/SafeLinkModal';
import { ThreatScannerView } from './components/ThreatScannerView';
import { UI_COPY } from './data/translations';
import type { AppLanguage, CaseRecord, HeatListItem, RiskLevel } from './types/forensics';

type ActiveScreen = 'scanner' | 'trending' | 'community';

export default function App() {
  const [lang, setLang] = useState<AppLanguage>('hi');
  const [screen, setScreen] = useState<ActiveScreen>('scanner');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [trendingItems, setTrendingItems] = useState<HeatListItem[]>([]);
  const [latestResult, setLatestResult] = useState<CaseRecord | null>(null);

  const [interceptedLink, setInterceptedLink] = useState<{
    url: string;
    riskLevel: RiskLevel;
    reasons: string[];
    lookAlikeTarget?: string;
  } | null>(null);

  const t = UI_COPY[lang];

  const fetchTrendingData = useCallback(async () => {
    try {
      const heatRes = await fetch('/api/heatlist');
      if (heatRes.ok) {
        const heatJson = await heatRes.json();
        setTrendingItems(heatJson.items || []);
      }
    } catch {
      // retain existing state on transient error
    }
  }, []);

  useEffect(() => {
    fetchTrendingData();
  }, [fetchTrendingData]);

  const handleCaseCreated = (record: CaseRecord) => {
    setLatestResult(record);
    fetchTrendingData();
  };

  const handleCaseUpdated = (updated: CaseRecord) => {
    if (latestResult?.caseId === updated.caseId) {
      setLatestResult(updated);
    }
    fetchTrendingData();
  };

  const handleInspectUrl = (url: string, record: CaseRecord) => {
    setInterceptedLink({
      url,
      riskLevel: record.riskLevel,
      reasons: record.indicators.map((i) => i.title),
      lookAlikeTarget: record.technical.lookAlikeTarget,
    });
  };

  const handleQuickCheck = async (text: string, url?: string) => {
    setScreen('scanner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          url,
          lang,
          channel: url ? 'Web Browser' : 'WhatsApp',
          submittedBy: 'Kavach Quick Check',
          saveToLedger: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.caseRecord) {
        handleCaseCreated(data.caseRecord as CaseRecord);
      }
    } catch {
      // handled gracefully
    }
  };

  const navItems: Array<{ id: ActiveScreen; label: string }> = [
    { id: 'scanner', label: t.navCheck },
    { id: 'trending', label: lang === 'hi' ? 'ट्रेंडिंग स्कैम' : 'Trending Scams' },
    { id: 'community', label: lang === 'hi' ? 'गुमनाम मंच' : 'Community' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
      {/* Clean 3-Zone Top Bar: Responsive for phones (60px) and desktop (72px) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 h-[60px] md:h-[72px] flex items-center justify-between gap-3 sm:gap-8">
          <button
            type="button"
            onClick={() => {
              setScreen('scanner');
              setMobileMenuOpen(false);
            }}
            className="inline-flex items-center gap-2 text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-[#0F172A] whitespace-nowrap shrink-0"
          >
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-[#0F172A]" />
            <span>Kavach · कवच</span>
          </button>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={`py-2 text-[16px] font-semibold whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#0F172A] border-[#0F172A]'
                      : 'text-[#475569] border-transparent hover:text-[#0F172A] hover:border-[#CBD5E1]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg bg-[#DC2626] text-white text-xs sm:text-sm font-bold hover:bg-[#B91C1C] whitespace-nowrap shrink-0"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.navReportCta}</span>
              <span className="sm:hidden">1930</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-[#0F172A] hover:bg-[#F1F5F9]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden bg-white border-t border-[#E2E8F0] px-4 py-3 space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg text-[16px] font-semibold ${
                  screen === item.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#334155] hover:bg-[#F1F5F9]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowEmergencyModal(true);
              }}
              className="block w-full text-left px-4 py-3 rounded-lg text-[16px] font-bold text-[#DC2626] bg-[#FEF2F2]"
            >
              {t.navReportCta}
            </button>
          </nav>
        )}
      </header>

      {/* Mobile Quick-Tab Strip (outside sticky header so phone viewport stays spacious) */}
      <nav
        aria-label="Mobile quick tabs"
        className="md:hidden bg-white border-b border-[#E2E8F0] px-3 py-2"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {navItems.map((item) => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`min-h-[42px] px-2 py-1.5 rounded-md text-xs font-bold truncate ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-5 sm:py-8 md:py-10">
        {screen === 'scanner' && (
          <ThreatScannerView
            lang={lang}
            onLangChange={setLang}
            heatItems={trendingItems}
            latestResult={latestResult}
            onCaseCreated={handleCaseCreated}
            onCaseUpdated={handleCaseUpdated}
            onInspectUrl={handleInspectUrl}
            onOpenTrendingTab={() => {
              setScreen('trending');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenEmergency={() => setShowEmergencyModal(true)}
          />
        )}

        {screen === 'trending' && (
          <NewsAndSafetyView
            lang={lang}
            onLangChange={setLang}
            heatItems={trendingItems}
            onQuickCheckText={handleQuickCheck}
          />
        )}

        {screen === 'community' && (
          <CommunityWallView
            lang={lang}
            onLangChange={setLang}
            onCheckInKavach={handleQuickCheck}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-[#475569]">
          <div>
            <strong className="text-[#0F172A]">Kavach (कवच)</strong> ·{' '}
            {lang === 'hi'
              ? 'बच्चों, बुजुर्गों और सभी नागरिकों के लिए सरल साइबर सुरक्षा'
              : 'Simple Cyber Safety for Children, Elders, and Citizens'}
          </div>
          <div>
            {lang === 'hi' ? 'राष्ट्रीय साइबर हेल्पलाइन:' : 'National Cyber Helpline:'}{' '}
            <strong className="text-[#0F172A]">1930</strong> · cybercrime.gov.in
          </div>
        </div>
      </footer>

      {interceptedLink && (
        <SafeLinkModal
          url={interceptedLink.url}
          riskLevel={interceptedLink.riskLevel}
          reasons={interceptedLink.reasons}
          lookAlikeTarget={interceptedLink.lookAlikeTarget}
          onClose={() => setInterceptedLink(null)}
        />
      )}

      {showEmergencyModal && (
        <Emergency1930Modal lang={lang} onClose={() => setShowEmergencyModal(false)} />
      )}
    </div>
  );
}
