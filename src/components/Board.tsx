import type { ActiveTile, Grid, Violation } from '../types';
import { CellView } from './Cell';

interface Props {
  grid: Grid;
  violations: Violation[];
  activeTile: ActiveTile;
  onPlace: (r: number, c: number) => void;
  onRemove: (r: number, c: number) => void;
}

export function Board({ grid, violations, activeTile: _activeTile, onPlace, onRemove }: Props) {
  const violationSet = new Set(violations.map((v) => `${v.row},${v.col}`));
  const size = grid.length;

  return (
    <div
      className="board"
      role="grid"
      style={{ gridTemplateColumns: `auto repeat(${size}, 1fr)` }}
    >
      {/* Corner */}
      <div className="board-corner" aria-hidden="true" />
      {/* Column headers (1-based) */}
      {Array.from({ length: size }, (_, c) => (
        <div key={`col-${c}`} className="board-label" aria-hidden="true">{c + 1}</div>
      ))}
      {/* Rows: row label + cells */}
      {grid.map((row, r) => (
        <RowFragment
          key={`row-${r}`}
          row={row}
          r={r}
          violationSet={violationSet}
          activeTile={_activeTile}
          onPlace={onPlace}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function RowFragment({
  row,
  r,
  violationSet,
  activeTile,
  onPlace,
  onRemove,
}: {
  row: (import('../types').Cell | null)[];
  r: number;
  violationSet: Set<string>;
  activeTile: ActiveTile;
  onPlace: (r: number, c: number) => void;
  onRemove: (r: number, c: number) => void;
}) {
  return (
    <>
      <div className="board-label" aria-hidden="true">{r + 1}</div>
      {row.map((cell, c) => (
        <CellView
          key={`${r}-${c}`}
          row={r}
          col={c}
          cell={cell}
          violating={violationSet.has(`${r},${c}`)}
          activeTile={activeTile}
          onPlace={onPlace}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}