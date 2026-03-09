import { trustColor } from '@/lib/utils';

export default function TrustBar({ score }: { score: number }) {
  const color = trustColor(score);
  return (
    <div className="trust-wrap">
      <div className="trust-bar">
        <div className="trust-fill" style={{ width: `${Math.min(score, 100)}%`, background: color }} />
      </div>
      <span className="trust-score" style={{ color }}>{score}</span>
    </div>
  );
}
