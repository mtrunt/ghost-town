import { useState } from 'react';
import type { ActiveTile, TileType } from '../types';
import { TILE_RULES } from '../config/rules';

interface Props {
  active: ActiveTile | null;
  onSelect: (tile: ActiveTile) => void;
}

const ORDER: TileType[] = ['start', 'pizza', 'mailbox', 'grave', 'fence', 'teleporter'];

export function TilePalette({ active, onSelect }: Props) {
  const [expanded, setExpanded] = useState<TileType | null>(null);

  return (
    <div className="palette">
      {ORDER.map((type) => {
        const rule = TILE_RULES[type];
        const isActive = active?.type === type && !active.variant;
        const isExpanded = expanded === type;
        return (
          <div key={type} className="palette-item">
            <button
              type="button"
              className={`palette-btn${isActive ? ' active' : ''}`}
              onClick={() => {
                if (rule.variants) {
                  setExpanded(isExpanded ? null : type);
                } else {
                  onSelect({ type });
                }
              }}
            >
              <span className="palette-icon">{rule.icon}</span>
              <span>{rule.label}</span>
            </button>
            {isExpanded && rule.variants && (
              <div className="palette-variants">
                {rule.variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`palette-variant${active?.type === type && active.variant === v ? ' active' : ''}`}
                    onClick={() => onSelect({ type, variant: v })}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}