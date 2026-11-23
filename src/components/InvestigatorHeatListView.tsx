import { BadgeCheck, Download, Flame, Link2, Loader2, Network, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AppLanguage, AuthUser, HeatListItem, HeatListPayload } from '../types/forensics';
import { downloadHeatListPdfReport, formatTimestamp } from '../utils/reportExport';
import { RiskBadge } from './RiskBadge';

interface InvestigatorHeatListViewProps {
  lang: AppLanguage;
  user: AuthUser;
  authToken: string;
  onPivotToCases: (identifier: string) => void;
  onOpenCase: (caseId: string) => void;
}

export function InvestigatorHeatListView({
  lang,
  user,
  authToken,
  onPivotToCases,
  onOpenCase,
}: InvestigatorHeatListViewProps) {
  const [payload, setPayload] = useState<HeatListPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | HeatListItem['type']>('all');

  const fetchHeatList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/heatlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load heat-list.');
      setPayload(data as HeatListPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchHeatList();
  }, [fetchHeatList]);

  const handleExportHeatList = () => {
    if (!payload) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            exportedBy: `${user.fullName} (${user.badgeId})`,
            ...payload,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kavach-heatlist-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const items = payload?.items || [];
  const filteredItems =
    typeFilter === 'all' ? items : items.filter((item) => item.type === typeFilter);

  const entityLabel = (type: HeatListItem['type']) => {
    if (type === 'domain') return 'Domain';
    if (type === 'phone') return 'Phone';
    if (type === 'upi') return 'UPI';
    if (type === 'package') return 'APK';
    return 'Crypto';
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
            <BadgeCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {user.fullName} ({user.badgeId})
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[30px] md:text-[34px] font-extrabold tracking-[-0.02em] text-[#0F172A] leading-tight">
            {lang === 'hi' ? 'अधिकारी हीट-लिस्ट' : 'Investigator Heat-List'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              payload &&
              downloadHeatListPdfReport(payload, `${user.fullName} (${user.badgeId || 'Officer'})`)
            }
            disabled={!payload}
            className="min-h-[40px] px-3.5 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-bold hover:bg-[#1E293B] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportHeatList}
            disabled={!payload}
            className="min-h-[40px] px-3 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold hover:bg-[#F8FAFC] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-resting rounded-lg p-8 text-center text-sm text-[#475569] inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3.5 text-sm font-semibold text-[#991B1B]">
          {error}
        </div>
      ) : payload ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card-resting rounded-lg p-3.5">
              <div className="text-[11px] font-bold uppercase text-[#475569]">IOCs</div>
              <div className="text-2xl font-extrabold text-[#DC2626] tabular-nums">
                {payload.stats.uniqueRiskyIdentifiers}
              </div>
            </div>
            <div className="card-resting rounded-lg p-3.5">
              <div className="text-[11px] font-bold uppercase text-[#475569]">Clusters</div>
              <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums">
                {payload.clusters.length}
              </div>
            </div>
            <div className="card-resting rounded-lg p-3.5">
              <div className="text-[11px] font-bold uppercase text-[#475569]">Linked</div>
              <div className="text-2xl font-extrabold text-[#2563EB] tabular-nums">
                {payload.stats.linkedCasesCount}
              </div>
            </div>
            <div className="card-resting rounded-lg p-3.5">
              <div className="text-[11px] font-bold uppercase text-[#475569]">Cases</div>
              <div className="text-2xl font-extrabold text-[#0F172A] tabular-nums">
                {payload.stats.totalCases}
              </div>
            </div>
          </div>

          {payload.clusters.length > 0 && (
            <section className="card-resting rounded-lg p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#E2E8F0]">
                <Network className="w-5 h-5 text-[#DC2626] shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  Linked Clusters ({payload.clusters.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {payload.clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2]/60 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#991B1B]">{cluster.id}</span>
                      <RiskBadge level={cluster.riskLevel} size="sm" />
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A]">{cluster.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.sharedEntities.map((ent) => (
                        <button
                          key={ent}
                          type="button"
                          onClick={() => onPivotToCases(ent)}
                          className="font-mono text-xs font-bold bg-white border border-[#FCA5A5] text-[#991B1B] px-2 py-0.5 rounded inline-flex items-center gap-1 break-all"
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          {ent}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#FCA5A5]/60">
                      {cluster.caseIds.map((cid) => (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => onOpenCase(cid)}
                          className="font-mono text-xs font-bold text-[#2563EB] bg-white border border-[#CBD5E1] px-2 py-0.5 rounded"
                        >
                          {cid}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card-resting rounded-lg p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#DC2626] shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  Top Reported IOCs ({filteredItems.length})
                </h2>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'domain', label: 'Domains' },
                    { id: 'phone', label: 'Phones' },
                    { id: 'upi', label: 'UPI' },
                    { id: 'package', label: 'APK' },
                    { id: 'crypto', label: 'Crypto' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap shrink-0 ${
                      typeFilter === tab.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#475569]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {filteredItems.map((item, idx) => (
                <div
                  key={`${item.type}-${item.value}`}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded bg-[#F1F5F9] text-[#0F172A] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#0F172A] break-all">
                          {item.type === 'domain' ? item.value.replace(/\./g, '[.]') : item.value}
                        </span>
                        <RiskBadge level={item.riskLevel} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569]">
                        <span className="font-semibold text-[#0F172A]">{entityLabel(item.type)}</span>
                        <span>·</span>
                        <span className="font-bold text-[#DC2626] tabular-nums">{item.reportCount}×</span>
                        <span>·</span>
                        <span className="tabular-nums">{formatTimestamp(item.lastSeen)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPivotToCases(item.value)}
                    className="min-h-[36px] px-3 rounded-md bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-center shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Cases ({item.caseIds.length})
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
