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
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <CellView
            key={`${r}-${c}`}
            row={r}
            col={c}
            cell={cell}
            violating={violationSet.has(`${r},${c}`)}
            activeTile={_activeTile}
            onPlace={onPlace}
            onRemove={onRemove}
          />
        )),
      )}
    </div>
  );
}