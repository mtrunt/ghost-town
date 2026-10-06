import type { ActiveTile, Cell as CellData } from '../types';
import { TILE_RULES } from '../config/rules';

interface Props {
  row: number;
  col: number;
  cell: CellData | null;
  violating: boolean;
  activeTile: ActiveTile;
  onPlace: (r: number, c: number) => void;
  onRemove: (r: number, c: number) => void;
}

export function CellView({ row, col, cell, violating, onPlace, onRemove }: Props) {
  const rule = cell ? TILE_RULES[cell.tile] : null;
  const icon = rule ? rule.icon : '';
  const color = rule
    ? (cell!.variant && rule.variantColors?.[cell!.variant]) ?? rule.color
    : 'transparent';

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`${row},${col}${cell ? ` ${TILE_RULES[cell.tile].label}` : ' empty'}`}
      className={`cell${violating ? ' violating' : ''}`}
      style={{ background: color }}
      onClick={() => (cell ? onRemove(row, col) : onPlace(row, col))}
    >
      {icon}
    </button>
  );
}