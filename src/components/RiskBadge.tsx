import type { RiskLevel } from '../types/forensics';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md';
}

export function RiskBadge({ level, score, size = 'md' }: RiskBadgeProps) {
  const styles: Record<RiskLevel, { container: string; dot: string; label: string }> = {
    HIGH: {
      container: 'bg-[#FEF2F2] border-[#F87171] text-[#991B1B]',
      dot: 'bg-[#DC2626]',
      label: 'HIGH RISK',
    },
    MEDIUM: {
      container: 'bg-[#FFFBEB] border-[#FBBF24] text-[#92400E]',
      dot: 'bg-[#D97706]',
      label: 'MEDIUM RISK',
    },
    LOW: {
      container: 'bg-[#F0FDF4] border-[#4ADE80] text-[#166534]',
      dot: 'bg-[#16A34A]',
      label: 'LOW RISK',
    },
  };

  const s = styles[level];
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[14px]';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-bold tracking-[0.06em] whitespace-nowrap shrink-0 tabular-nums ${s.container} ${pad}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
      <span>{s.label}</span>
      {typeof score === 'number' && <span className="opacity-80 font-mono">({score}/100)</span>}
    </span>
  );
}
