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

export interface PortalSettings {
  /** When true, teleporters may not be placed adjacent to pizza boxes. */
  noPizzaAdjacent: boolean;
  /** Adjacency metric for noPizzaAdjacent. 'chebyshev' = 8-dir, 'manhattan' = 4-dir. */
  pizzaAdjacencyMetric: 'chebyshev' | 'manhattan';
  /** When true, teleporters may not be placed adjacent to mailboxes (houses). */
  noMailboxAdjacent: boolean;
  /** When non-null, teleporters must be at least this many cells apart (Chebyshev). */
  minDistance: number | null;
  /** When true, mailboxes must be at least `minDistance` (Chebyshev) from pizza
   *  of the same variant. Only applies when `minDistance` is non-null. */
  mailboxMinDistance: boolean;
}

export interface TileRule {
  type: TileType;
  label: string;
  icon: string;
  color: string;
  /** Per-variant background colors. When present, used instead of `color` for cells with a variant. */
  variantColors?: Record<string, string>;
  variants?: string[];
  count: (players: number) => number;
  variantAssignment?: (players: number) => string[];
  canPlace: (
    grid: Grid,
    r: number,
    c: number,
    variant?: string,
    settings?: PortalSettings,
  ) => boolean;
}

export interface GlobalRules {
  minSize: number;
  maxSize: number;
  startExclusionRadius: number;
  movementDirections: '4' | '8';
  checkAccessibility: (grid: Grid) => boolean;
  oneTilePerCell: boolean;
  portalSettings: PortalSettings;
}

export interface ActiveTile {
  type: TileType;
  variant?: string;
}