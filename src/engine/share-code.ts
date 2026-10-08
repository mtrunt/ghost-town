import type { PortalSettings } from '../types';

export interface ShareParams {
  size: number;
  players: number;
  portalSettings: PortalSettings;
  seed: number;
}

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(value: number): string {
  let result = '';
  let v = value;
  do {
    result = BASE62_CHARS[v % 62] + result;
    v = Math.floor(v / 62);
  } while (v > 0);
  return result;
}

function fromBase62(str: string): number {
  let result = 0;
  for (const char of str) {
    const idx = BASE62_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid character in code: '${char}'`);
    result = result * 62 + idx;
  }
  return result;
}

/** Bit layout (35 bits, MSB-first):
 *  size:3 | players:2 | noPizzaAdjacent:1 | metric:1 | noMailboxAdjacent:1 | minDistance:3 | mailboxMinDistance:1 | seed:23
 *  Uses multiplication instead of bitwise shifts because JS bitwise ops
 *  truncate to 32-bit signed integers, and 35 bits exceeds that. */
export function encodeShareCode(params: ShareParams): string {
  const sizeIdx = params.size - 5;
  const playersIdx = params.players - 2;
  const metricBit = params.portalSettings.pizzaAdjacencyMetric === 'manhattan' ? 1 : 0;
  const minDistEncoded = params.portalSettings.minDistance ?? 0;
  const mailboxMinDist = params.portalSettings.mailboxMinDistance ? 1 : 0;

  const value =
    sizeIdx * 4294967296 +          // << 32
    playersIdx * 1073741824 +       // << 30
    (params.portalSettings.noPizzaAdjacent ? 1 : 0) * 536870912 +  // << 29
    metricBit * 268435456 +         // << 28
    (params.portalSettings.noMailboxAdjacent ? 1 : 0) * 134217728 + // << 27
    minDistEncoded * 16777216 +     // << 24
    mailboxMinDist * 8388608 +      // << 23
    params.seed;

  return toBase62(value).padStart(6, '0');
}

export function decodeShareCode(code: string): ShareParams {
  if (code.length !== 6) throw new Error('Code must be exactly 6 characters');
  const value = fromBase62(code);

  const seed = value % 8388608;
  let rest = Math.floor(value / 8388608);

  const mailboxMinDistance = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const minDistEncoded = rest % 8;
  rest = Math.floor(rest / 8);

  const noMailboxAdjacent = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const metricBit = rest % 2;
  rest = Math.floor(rest / 2);

  const noPizzaAdjacent = (rest % 2) === 1;
  rest = Math.floor(rest / 2);

  const playersIdx = rest % 4;
  rest = Math.floor(rest / 4);

  const sizeIdx = rest;

  if (sizeIdx > 5) throw new Error('Invalid size in code');
  if (playersIdx > 2) throw new Error('Invalid player count in code');

  const portalSettings: PortalSettings = {
    noPizzaAdjacent,
    pizzaAdjacencyMetric: metricBit === 1 ? 'manhattan' : 'chebyshev',
    noMailboxAdjacent,
    minDistance: minDistEncoded === 0 ? null : minDistEncoded,
    mailboxMinDistance,
  };

  return {
    size: sizeIdx + 5,
    players: playersIdx + 2,
    portalSettings,
    seed,
  };
}