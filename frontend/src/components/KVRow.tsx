export default function KVRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="kv-row">
      <span className="kv-key">{label}</span>
      <span className="kv-val" style={mono ? {} : { fontFamily: 'inherit' }}>{value}</span>
    </div>
  );
}
