import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileJson,
  FileText,
  Link2,
  Loader2,
  PlusCircle,
  Printer,
  Search,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppLanguage,
  AssetType,
  AuthUser,
  CaseRecord,
  CaseStatus,
  RiskLevel,
} from '../types/forensics';
import {
  defangUrl,
  downloadJsonEvidenceBundle,
  downloadPdfEvidenceReport,
  formatTimestamp,
} from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface InvestigationDashboardViewProps {
  lang: AppLanguage;
  user: AuthUser;
  authToken: string;
  initialSearchQuery?: string;
  initialSelectedCaseId?: string | null;
  onInspectUrl: (url: string, record: CaseRecord) => void;
  onOpenScannerForIntake: () => void;
  onClearExternalFilter?: () => void;
}

const STATUS_OPTIONS: CaseStatus[] = ['Open', 'Under Review', 'Escalated to LEA', 'Closed / Benign'];

export function InvestigationDashboardView({
  lang,
  user,
  authToken,
  initialSearchQuery = '',
  initialSelectedCaseId = null,
  onInspectUrl,
  onOpenScannerForIntake,
  onClearExternalFilter,
}: InvestigationDashboardViewProps) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [query, setQuery] = useState(initialSearchQuery);
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [assetFilter, setAssetFilter] = useState<'all' | AssetType>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CaseStatus>('ALL');

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialSelectedCaseId);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [noteInput, setNoteInput] = useState('');
  const [statusDraft, setStatusDraft] = useState<CaseStatus>('Open');
  const [isSavingTriage, setIsSavingTriage] = useState(false);
  const [triageMessage, setTriageMessage] = useState<string | null>(null);

  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialSearchQuery !== undefined) setQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialSelectedCaseId) setSelectedCaseId(initialSelectedCaseId);
  }, [initialSelectedCaseId]);

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (riskFilter !== 'ALL') params.set('risk', riskFilter);
      if (assetFilter !== 'all') params.set('assetType', assetFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/cases?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load cases.');
      const list = (data.cases || []) as CaseRecord[];
      setCases(list);
      setSelectedCaseId((prev) => (prev && list.some((c) => c.caseId === prev) ? prev : list[0]?.caseId || null));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Load failed.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, query, riskFilter, assetFilter, statusFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const selectedCase = cases.find((c) => c.caseId === selectedCaseId) || cases[0] || null;

  useEffect(() => {
    if (selectedCase) {
      setStatusDraft(selectedCase.status);
      setTriageMessage(null);
    }
  }, [selectedCase?.caseId, selectedCase?.status]);

  const handleCopy = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(val);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    if (window.innerWidth < 1024) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  };

  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setIsSavingTriage(true);
    setTriageMessage(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(selectedCase.caseId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: statusDraft, note: noteInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.caseRecord) throw new Error(data.error || 'Update failed.');
      const updated = data.caseRecord as CaseRecord;
      setCases((prev) => prev.map((c) => (c.caseId === updated.caseId ? updated : c)));
      setNoteInput('');
      setTriageMessage(lang === 'hi' ? 'सेव हो गया।' : 'Saved.');
    } catch (err) {
      setTriageMessage(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setIsSavingTriage(false);
    }
  };

  const highRiskCount = cases.filter((c) => c.riskLevel === 'HIGH').length;
  const escalatedCount = cases.filter((c) => c.status === 'Escalated to LEA').length;
  const linkedCount = cases.filter((c) => c.linkedCases.length > 0).length;

  const statusTone = (status: CaseStatus) => {
    if (status === 'Escalated to LEA') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]';
    if (status === 'Under Review') return 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]';
    if (status === 'Closed / Benign') return 'bg-[#F0FDF4] text-[#166534] border-[#86EFAC]';
    return 'bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]';
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534]">
            <BadgeCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {user.fullName} ({user.badgeId})
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[30px] md:text-[34px] font-extrabold tracking-[-0.02em] text-[#0F172A] leading-tight">
            {lang === 'hi' ? 'जांच डैशबोर्ड' : 'Investigation Dashboard'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenScannerForIntake}
          className="min-h-[42px] px-4 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-bold hover:bg-[#1E293B] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>{lang === 'hi' ? 'नया केस' : 'New Intake'}</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-resting rounded-lg p-3.5">
          <div className="text-[11px] font-bold uppercase text-[#475569]">
            {lang === 'hi' ? 'केस' : 'Cases'}
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums">{cases.length}</div>
        </div>
        <div className="card-resting rounded-lg p-3.5">
          <div className="text-[11px] font-bold uppercase text-[#991B1B]">
            {lang === 'hi' ? 'हाई रिस्क' : 'High Risk'}
          </div>
          <div className="text-2xl font-extrabold text-[#DC2626] tabular-nums">{highRiskCount}</div>
        </div>
        <div className="card-resting rounded-lg p-3.5">
          <div className="text-[11px] font-bold uppercase text-[#0F172A]">
            {lang === 'hi' ? 'एस्केलेटेड' : 'Escalated'}
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums">{escalatedCount}</div>
        </div>
        <div className="card-resting rounded-lg p-3.5">
          <div className="text-[11px] font-bold uppercase text-[#2563EB]">
            {lang === 'hi' ? 'जुड़े केस' : 'Linked'}
          </div>
          <div className="text-2xl font-extrabold text-[#2563EB] tabular-nums">{linkedCount}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <section className="card-resting rounded-lg p-3.5 sm:p-4 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="sm:col-span-2 lg:col-span-5 relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onClearExternalFilter?.();
              }}
              placeholder={lang === 'hi' ? 'केस ID, लिंक, फोन, UPI खोजें...' : 'Search ID, domain, phone, UPI...'}
              className="w-full min-h-[42px] pl-9 pr-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
            />
          </div>

          <select
            aria-label="Risk"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as 'ALL' | RiskLevel)}
            className="lg:col-span-2 min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
          >
            <option value="ALL">All Risk</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            aria-label="Asset Type"
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value as 'all' | AssetType)}
            className="lg:col-span-2 min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
          >
            <option value="all">All Types</option>
            <option value="message">Message</option>
            <option value="url">URL</option>
            <option value="apk">APK</option>
            <option value="website">Website</option>
          </select>

          <select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | CaseStatus)}
            className="sm:col-span-2 lg:col-span-3 min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {(query || riskFilter !== 'ALL' || assetFilter !== 'all' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span>{cases.length} found</span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setRiskFilter('ALL');
                setAssetFilter('all');
                setStatusFilter('ALL');
                onClearExternalFilter?.();
              }}
              className="font-bold text-[#2563EB] hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </section>

      {fetchError && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm font-semibold text-[#991B1B]">
          {fetchError}
        </div>
      )}

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 space-y-2">
          {isLoading ? (
            <div className="card-resting rounded-lg p-6 text-center text-sm text-[#475569] inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="card-resting rounded-lg p-6 text-center text-sm text-[#475569]">
              No matching cases.
            </div>
          ) : (
            cases.map((c) => {
              const active = selectedCase?.caseId === c.caseId;
              const maxSim = c.linkedCases.reduce((m, l) => Math.max(m, l.similarityScore), 0);
              return (
                <button
                  key={c.caseId}
                  type="button"
                  onClick={() => handleSelectCase(c.caseId)}
                  className={`w-full text-left rounded-lg p-3.5 border space-y-1.5 ${
                    active
                      ? 'bg-white border-[#0F172A] ring-2 ring-[#0F172A]/10'
                      : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#0F172A]">{c.caseId}</span>
                    <RiskBadge level={c.riskLevel} score={c.riskScore} size="sm" />
                  </div>
                  <div className="text-sm font-bold text-[#0F172A] line-clamp-2">{c.title}</div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${statusTone(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#2563EB]">
                      <Link2 className="w-3 h-3" />
                      {c.linkedCases.length}
                      {maxSim > 0 ? ` · ${maxSim}%` : ''}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div ref={detailRef} className="lg:col-span-7 min-w-0">
          {selectedCase ? (
            <div className="card-resting rounded-lg p-4 sm:p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569]">
                    <span className="font-mono font-bold text-[#0F172A]">{selectedCase.caseId}</span>
                    <span>·</span>
                    <span>{selectedCase.threatCategory}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] leading-snug">
                    {selectedCase.title}
                  </h2>
                </div>
                <RiskBadge level={selectedCase.riskLevel} score={selectedCase.riskScore} />
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPdfEvidenceReport(selectedCase)}
                  className="min-h-[40px] px-3.5 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-bold hover:bg-[#1E293B] inline-flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => downloadJsonEvidenceBundle(selectedCase)}
                  className="min-h-[40px] px-3 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <FileJson className="w-4 h-4" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[40px] px-3 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>

              {/* Evidence Snapshot */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold uppercase text-[#475569]">Evidence Snapshot</span>
                  <span className="font-mono text-[#64748B] truncate">
                    SHA-256: {selectedCase.evidenceHash.slice(0, 16)}…
                  </span>
                </div>
                <pre className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs font-mono text-[#0F172A] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {selectedCase.rawInput}
                </pre>
              </div>

              {/* Risk Indicators */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-[#475569] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                  Indicators ({selectedCase.indicators.length})
                </h3>
                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3">
                  {selectedCase.indicators.map((ind) => (
                    <div key={ind.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#0F172A]">{ind.title}</div>
                        <p className="text-xs text-[#334155]">{ind.explanation}</p>
                      </div>
                      <RiskBadge level={ind.severity} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {selectedCase.technical.apkInfo && (
                <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#991B1B] break-all">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    {selectedCase.technical.apkInfo.packageName}
                  </div>
                  {selectedCase.technical.apkInfo.dangerousPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedCase.technical.apkInfo.dangerousPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="font-mono text-[11px] font-bold bg-white border border-[#FCA5A5] text-[#991B1B] px-2 py-0.5 rounded"
                        >
                          {perm.replace('android.permission.', '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Identifiers */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-[#475569]">Extracted Identifiers</h3>
                {(
                  [
                    { label: 'Domains', list: selectedCase.identifiers.domains },
                    { label: 'URLs', list: selectedCase.identifiers.urls, isUrl: true },
                    { label: 'Phones', list: selectedCase.identifiers.phoneNumbers },
                    { label: 'UPI', list: selectedCase.identifiers.upiIds },
                    { label: 'Bank', list: selectedCase.identifiers.bankAccounts },
                    { label: 'Crypto', list: selectedCase.identifiers.cryptoWallets },
                    { label: 'APK', list: selectedCase.identifiers.packageNames },
                    { label: 'IP', list: selectedCase.identifiers.ipAddresses },
                  ] as Array<{ label: string; list: string[]; isUrl?: boolean }>
                )
                  .filter((g) => g.list.length > 0)
                  .map((group) => (
                    <div key={group.label} className="space-y-1">
                      <div className="text-[11px] font-bold uppercase text-[#64748B]">{group.label}</div>
                      {group.list.map((val) => (
                        <div
                          key={val}
                          className="flex flex-wrap items-center justify-between gap-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1.5"
                        >
                          <span className="font-mono text-xs font-semibold text-[#0F172A] break-all">
                            {group.isUrl ? defangUrl(val) : val}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setQuery(val)}
                              className="text-xs font-bold text-[#2563EB] hover:underline"
                            >
                              Pivot
                            </button>
                            {group.isUrl && (
                              <button
                                type="button"
                                onClick={() => onInspectUrl(val, selectedCase)}
                                className="inline-flex items-center gap-0.5 text-xs font-bold text-[#DC2626] hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Warn
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopy(group.isUrl ? defangUrl(val) : val)}
                              className="text-[#475569] hover:text-[#0F172A]"
                              aria-label="Copy"
                            >
                              {copiedKey === (group.isUrl ? defangUrl(val) : val) ? (
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

              {/* Linked Cases */}
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-bold uppercase text-[#475569] flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#2563EB]" />
                  Linked Cases ({selectedCase.linkedCases.length})
                </h3>
                {selectedCase.linkedCases.length === 0 ? (
                  <p className="text-xs text-[#64748B]">None yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.linkedCases.map((match) => (
                      <div
                        key={match.caseId}
                        className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#0F172A]">{match.caseId}</span>
                            <RiskBadge level={match.riskLevel} size="sm" />
                            <span className="text-xs font-bold text-[#2563EB] tabular-nums">
                              {match.similarityScore}%
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate">
                            {match.title}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setRiskFilter('ALL');
                            setAssetFilter('all');
                            setStatusFilter('ALL');
                            setSelectedCaseId(match.caseId);
                          }}
                          className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-xs font-bold text-[#0F172A] whitespace-nowrap shrink-0"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Triage Update */}
              <form onSubmit={handleSaveTriage} className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as CaseStatus)}
                    className="min-h-[40px] px-2.5 rounded-lg bg-white border border-[#94A3B8] text-xs sm:text-sm font-semibold text-[#0F172A]"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add officer note..."
                    className="sm:col-span-2 min-h-[40px] px-3 rounded-lg bg-white border border-[#94A3B8] text-xs sm:text-sm text-[#0F172A]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#166534]">{triageMessage || ''}</span>
                  <button
                    type="submit"
                    disabled={isSavingTriage}
                    className="min-h-[38px] px-4 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                  >
                    {isSavingTriage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Update
                  </button>
                </div>
              </form>

              {/* Audit Timeline */}
              <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-bold uppercase text-[#475569] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Timeline ({selectedCase.timeline.length})
                </h3>
                <div className="space-y-1.5">
                  {selectedCase.timeline.map((entry) => (
                    <div key={entry.id} className="rounded border border-[#E2E8F0] bg-white px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-[#0F172A]">{entry.action}</span>
                        <span className="text-[#64748B] tabular-nums">{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <p className="text-[#334155] mt-0.5">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card-resting rounded-lg p-8 text-center text-sm text-[#475569]">
              Select a case.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
