export type TileType =
  | 'start'
  | 'pizza'
  | 'mailbox'
  | 'grave'
  | 'fence'
  | 'teleporter';

export interface Cell {
  tile: TileType;
  variant?: string;
}

export type Grid = (Cell | null)[][];

export interface Violation {
  row: number;
  col: number;
  message: string;
}

export interface TileRule {
  type: TileType;
  label: string;
  icon: string;
  color: string;
  variants?: string[];
  count: (players: number) => number;
  variantAssignment?: (players: number) => string[];
  canPlace: (grid: Grid, r: number, c: number, variant?: string) => boolean;
}

export interface GlobalRules {
  minSize: number;
  maxSize: number;
  startExclusionRadius: number;
  movementDirections: '4' | '8';
  checkAccessibility: (grid: Grid) => boolean;
  oneTilePerCell: boolean;
}

export interface ActiveTile {
  type: TileType;
  variant?: string;
}