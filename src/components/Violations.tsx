import type { Violation } from '../types';

interface Props {
  violations: Violation[];
  error: string | null;
}

export function Violations({ violations, error }: Props) {
  if (error) {
    return (
      <div className="violations">
        <h3>Errors</h3>
        <p className="error-msg">{error}</p>
      </div>
    );
  }
  if (violations.length === 0) {
    return (
      <div className="violations">
        <h3>Violations</h3>
        <p className="ok-msg">✓ Setup is valid</p>
      </div>
    );
  }
  return (
    <div className="violations">
      <h3>Violations ({violations.length})</h3>
      <ul>
        {violations.map((v, i) => (
          <li key={i}>
            {v.row >= 0 ? `(${v.row + 1},${v.col + 1}): ` : ''}
            {v.message}
          </li>
        ))}
      </ul>
    </div>
  );
}