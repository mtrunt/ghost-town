import type { PortalSettings } from '../types';

interface Props {
  players: number;
  size: number;
  portalSettings: PortalSettings;
  onPlayersChange: (n: number) => void;
  onSizeChange: (n: number) => void;
  onPortalSettingsChange: (settings: PortalSettings) => void;
}

export function Controls({
  players,
  size,
  portalSettings,
  onPlayersChange,
  onSizeChange,
  onPortalSettingsChange,
}: Props) {
  return (
    <div className="controls">
      <label>
        Players
        <select
          aria-label="players"
          value={players}
          onChange={(e) => onPlayersChange(Number(e.target.value))}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label>
        Size
        <input
          aria-label="size"
          type="number"
          min={5}
          max={10}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        />
      </label>

      <label>
        <input
          type="checkbox"
          aria-label="portals not adjacent to pizza"
          checked={portalSettings.noPizzaAdjacent}
          onChange={(e) =>
            onPortalSettingsChange({
              ...portalSettings,
              noPizzaAdjacent: e.target.checked,
            })
          }
        />
        Portals not adjacent to pizza
      </label>
      {portalSettings.noPizzaAdjacent && (
        <label>
          Adjacency metric
          <select
            aria-label="adjacency metric"
            value={portalSettings.pizzaAdjacencyMetric}
            onChange={(e) =>
              onPortalSettingsChange({
                ...portalSettings,
                pizzaAdjacencyMetric: e.target.value as 'chebyshev' | 'manhattan',
              })
            }
          >
            <option value="chebyshev">Chebyshev (8-dir)</option>
            <option value="manhattan">Manhattan (4-dir)</option>
          </select>
        </label>
      )}

      <label>
        <input
          type="checkbox"
          aria-label="min portal distance"
          checked={portalSettings.minDistance != null}
          onChange={(e) =>
            onPortalSettingsChange({
              ...portalSettings,
              minDistance: e.target.checked ? 2 : null,
            })
          }
        />
        Min portal distance
      </label>
      {portalSettings.minDistance != null && (
        <label>
          Min distance threshold
          <select
            aria-label="min distance threshold"
            value={portalSettings.minDistance}
            onChange={(e) =>
              onPortalSettingsChange({
                ...portalSettings,
                minDistance: Number(e.target.value),
              })
            }
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}