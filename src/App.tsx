import { BadgeCheck, LogOut, Menu, PhoneCall, Shield, UserCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AuthPortalModal } from './components/AuthPortalModal';
import { CommunityWallView } from './components/CommunityWallView';
import { Emergency1930Modal } from './components/Emergency1930Modal';
import { InvestigationDashboardView } from './components/InvestigationDashboardView';
import { InvestigatorHeatListView } from './components/InvestigatorHeatListView';
import { NewsAndSafetyView } from './components/NewsAndSafetyView';
import { SafeLinkModal } from './components/SafeLinkModal';
import { ThreatScannerView } from './components/ThreatScannerView';
import { UI_COPY } from './data/translations';
import type { AppLanguage, AuthUser, CaseRecord, HeatListItem, RiskLevel } from './types/forensics';

type ActiveScreen = 'scanner' | 'trending' | 'community' | 'dashboard' | 'heatlist';

export default function App() {
  const [lang, setLang] = useState<AppLanguage>('hi');
  const [screen, setScreen] = useState<ActiveScreen>('scanner');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Role-based session held strictly in React memory (never localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const isInvestigator = Boolean(
    authToken && authUser?.role === 'investigator' && authUser.idProofVerified
  );

  // Investigator-only live heat-list items & cross-tab pivot state
  const [investigatorHeatItems, setInvestigatorHeatItems] = useState<HeatListItem[]>([]);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardSelectedCaseId, setDashboardSelectedCaseId] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<CaseRecord | null>(null);

  const [interceptedLink, setInterceptedLink] = useState<{
    url: string;
    riskLevel: RiskLevel;
    reasons: string[];
    lookAlikeTarget?: string;
  } | null>(null);

  const t = UI_COPY[lang];

  const fetchInvestigatorHeatData = useCallback(async () => {
    if (!isInvestigator || !authToken) {
      setInvestigatorHeatItems([]);
      return;
    }
    try {
      const heatRes = await fetch('/api/heatlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (heatRes.ok) {
        const heatJson = await heatRes.json();
        setInvestigatorHeatItems(heatJson.items || []);
      }
    } catch {
      // retain existing state
    }
  }, [isInvestigator, authToken]);

  useEffect(() => {
    fetchInvestigatorHeatData();
  }, [fetchInvestigatorHeatData]);

  const handleAuthenticated = (token: string, user: AuthUser) => {
    setAuthToken(token);
    setAuthUser(user);
    if (user.role === 'investigator' && user.idProofVerified) {
      setScreen('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (screen === 'dashboard' || screen === 'heatlist') {
      setScreen('scanner');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // best-effort logout
      }
    }
    setAuthToken(null);
    setAuthUser(null);
    setInvestigatorHeatItems([]);
    setDashboardSearchQuery('');
    setDashboardSelectedCaseId(null);
    if (screen === 'dashboard' || screen === 'heatlist') {
      setScreen('scanner');
    }
  };

  const handleCaseCreated = (record: CaseRecord) => {
    setLatestResult(record);
    if (isInvestigator) {
      fetchInvestigatorHeatData();
    }
  };

  const handleCaseUpdated = (updated: CaseRecord) => {
    if (latestResult?.caseId === updated.caseId) {
      setLatestResult(updated);
    }
    if (isInvestigator) {
      fetchInvestigatorHeatData();
    }
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: text,
          url,
          lang,
          channel: url ? 'Web Browser' : 'WhatsApp',
          submittedBy: authToken ? undefined : 'Kavach Quick Check',
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

  const citizenNavItems: Array<{ id: ActiveScreen; label: string }> = [
    { id: 'scanner', label: t.navCheck },
    { id: 'trending', label: t.navNews },
    { id: 'community', label: t.navCases },
  ];

  const navItems: Array<{ id: ActiveScreen; label: string; investigatorOnly?: boolean }> =
    isInvestigator
      ? [
          ...citizenNavItems,
          { id: 'dashboard', label: lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard', investigatorOnly: true },
          { id: 'heatlist', label: t.navHeat, investigatorOnly: true },
        ]
      : citizenNavItems;

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Universal Responsive Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 h-[56px] md:h-[64px] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setScreen('scanner');
              setMobileMenuOpen(false);
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-[17px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-[#0F172A] whitespace-nowrap shrink-0"
          >
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F172A] shrink-0" />
            <span>Kavach</span>
            <span className="hidden xs:inline sm:inline text-[#475569] font-bold">· कवच</span>
          </button>

          <nav className="hidden lg:flex items-center gap-5" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#0F172A] border-[#0F172A]'
                      : item.investigatorOnly
                      ? 'text-[#166534] border-transparent hover:border-[#86EFAC]'
                      : 'text-[#475569] border-transparent hover:text-[#0F172A] hover:border-[#CBD5E1]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Compact Global Language Toggle */}
            <div
              className="inline-flex items-center p-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-md shrink-0"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`min-h-[34px] px-2 sm:px-2.5 rounded text-xs font-bold ${
                  lang === 'hi' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'
                }`}
              >
                हिं
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`min-h-[34px] px-2 sm:px-2.5 rounded text-xs font-bold ${
                  lang === 'en' ? 'bg-[#0F172A] text-white' : 'text-[#334155]'
                }`}
              >
                EN
              </button>
            </div>

            {authUser ? (
              <div className="inline-flex items-center gap-1.5">
                <span
                  className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold border whitespace-nowrap ${
                    isInvestigator
                      ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#334155]'
                  }`}
                >
                  {isInvestigator ? (
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="max-w-[96px] truncate">
                    {isInvestigator ? authUser.badgeId : authUser.fullName}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[36px] sm:min-h-[40px] px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs font-bold hover:bg-[#F8FAFC] inline-flex items-center gap-1 whitespace-nowrap"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'hi' ? 'लॉगआउट' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-bold hover:bg-[#1E293B] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {lang === 'hi' ? 'लॉगिन / साइन इन' : 'Login / Sign In'}
                </span>
                <span className="sm:hidden">{lang === 'hi' ? 'लॉगिन' : 'Login'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="inline-flex items-center justify-center gap-1 min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 rounded-lg bg-[#DC2626] text-white text-xs sm:text-sm font-bold hover:bg-[#B91C1C] whitespace-nowrap shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>1930</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-[#0F172A] hover:bg-[#F1F5F9]"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="lg:hidden bg-white border-t border-[#E2E8F0] px-3 py-2.5 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold ${
                  screen === item.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#334155] hover:bg-[#F1F5F9]'
                }`}
              >
                {item.label}
              </button>
            ))}
            {!authUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAuthModal(true);
                }}
                className="block w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-bold text-[#0F172A] bg-[#F1F5F9]"
              >
                {lang === 'hi' ? 'लॉगिन / साइन इन' : 'Login / Sign In'}
              </button>
            )}
          </nav>
        )}
      </header>

      {/* Seamless Single-Row Scrollable Tab Bar on Mobile & Tablet */}
      <nav
        aria-label="Quick tabs"
        className="lg:hidden bg-white border-b border-[#E2E8F0] px-3 py-2"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : item.investigatorOnly
                    ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {screen === 'scanner' && (
          <ThreatScannerView
            lang={lang}
            heatItems={isInvestigator ? investigatorHeatItems : []}
            isInvestigator={isInvestigator}
            authToken={authToken}
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
          <NewsAndSafetyView lang={lang} onQuickCheckText={handleQuickCheck} />
        )}

        {screen === 'community' && (
          <CommunityWallView lang={lang} onCheckInKavach={handleQuickCheck} />
        )}

        {screen === 'dashboard' && isInvestigator && authUser && authToken && (
          <InvestigationDashboardView
            lang={lang}
            user={authUser}
            authToken={authToken}
            initialSearchQuery={dashboardSearchQuery}
            initialSelectedCaseId={dashboardSelectedCaseId}
            onInspectUrl={handleInspectUrl}
            onOpenScannerForIntake={() => {
              setScreen('scanner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onClearExternalFilter={() => {
              setDashboardSearchQuery('');
              setDashboardSelectedCaseId(null);
            }}
          />
        )}

        {screen === 'heatlist' && isInvestigator && authUser && authToken && (
          <InvestigatorHeatListView
            lang={lang}
            user={authUser}
            authToken={authToken}
            onPivotToCases={(identifier) => {
              setDashboardSelectedCaseId(null);
              setDashboardSearchQuery(identifier);
              setScreen('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCase={(caseId) => {
              setDashboardSearchQuery('');
              setDashboardSelectedCaseId(caseId);
              setScreen('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-8">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-[#475569]">
          <span>
            <strong className="text-[#0F172A]">Kavach · कवच</strong> ·{' '}
            {lang === 'hi' ? 'सिंथेटिक डेमो डेटा' : 'Demo Data'}
          </span>
          <span>
            {lang === 'hi' ? 'हेल्पलाइन:' : 'Helpline:'}{' '}
            <strong className="text-[#0F172A]">1930</strong> · cybercrime.gov.in
          </span>
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

      {showAuthModal && (
        <AuthPortalModal
          lang={lang}
          onAuthenticated={handleAuthenticated}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
