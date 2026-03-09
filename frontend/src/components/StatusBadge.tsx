import { statusColor } from '@/lib/utils';

export default function StatusBadge({ status }: { status: string }) {
  const { bg, color } = statusColor(status);
  return (
    <span className="badge" style={{ background: bg, color, border: `1px solid ${color}33` }}>
      {status}
    </span>
  );
}
