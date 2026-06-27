export function ProgressBar({
  fraction,
  left,
  right,
}: {
  fraction: number;
  left?: string;
  right?: string;
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div>
      {(left || right) && (
        <div className="progress-label">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
      <div className="progress">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
