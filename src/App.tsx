import { useCallback, useEffect, useState } from 'react';
import type { ActiveTile } from './types';
import { useGrid } from './hooks/useGrid';
import { Board } from './components/Board';
import { TilePalette } from './components/TilePalette';
import { Controls } from './components/Controls';
import { Violations } from './components/Violations';
import { GLOBAL_RULES } from './config/rules';
import './App.css';

export default function App() {
  const [players, setPlayers] = useState(2);
  const [active, setActive] = useState<ActiveTile | null>(null);
  const [portalSettings, setPortalSettings] = useState(GLOBAL_RULES.portalSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadCode, setLoadCode] = useState('');
  const [copied, setCopied] = useState(false);
  const onLoadSettings = useCallback(({ players, portalSettings }: { players: number; portalSettings: typeof GLOBAL_RULES.portalSettings }) => {
    setPlayers(players);
    setPortalSettings(portalSettings);
  }, []);
  const { grid, violations, error, shareCode, place, remove, clear, resize, generate, load } = useGrid(portalSettings, onLoadSettings);

  useEffect(() => {
    setLoadCode(shareCode ?? '');
    setCopied(false);
  }, [shareCode]);

  const handleLoad = () => {
    load(loadCode.trim());
  };

  const handleCopy = async () => {
    if (!loadCode) return;
    try {
      await navigator.clipboard.writeText(loadCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const handlePlace = (r: number, c: number) => {
    if (active) place(r, c, active);
  };
  const handleSizeChange = (n: number) => {
    if (n < 5 || n > 10) return;
    const hasTiles = grid.some((row) => row.some(Boolean));
    if (!hasTiles || window.confirm('Changing the grid size will clear the current setup. Continue?')) {
      resize(n);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Ghost Town Setup</h1>
          <div className="app-header-actions">
            <button type="button" className="action-btn" onClick={() => generate(players)}>Generate</button>
            <button type="button" className="action-btn secondary" onClick={clear}>Clear</button>
            <button type="button" className="controls-toggle" aria-label="toggle settings" onClick={() => setSettingsOpen((v) => !v)}>
              {settingsOpen ? '✕' : '⚙'}
            </button>
          </div>
        </div>
        <div className="load-row">
          <input
            type="text"
            placeholder="code"
            maxLength={6}
            value={loadCode}
            onChange={(e) => setLoadCode(e.target.value)}
            aria-label="board code"
            className="load-input"
          />
          <button type="button" className="action-btn secondary" onClick={handleLoad}>Load</button>
          <button
            type="button"
            className="action-btn secondary"
            onClick={handleCopy}
            disabled={!loadCode}
            aria-label="copy board code"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {settingsOpen && (
          <Controls
            players={players}
            size={grid.length}
            portalSettings={portalSettings}
            onPlayersChange={setPlayers}
            onSizeChange={handleSizeChange}
            onPortalSettingsChange={setPortalSettings}
          />
        )}
      </header>
      <main className="app-main">
        <Board
          grid={grid}
          violations={violations}
          activeTile={active ?? { type: 'grave' }}
          onPlace={handlePlace}
          onRemove={remove}
        />
        <TilePalette active={active} onSelect={setActive} />
        <Violations violations={violations} error={error} />
      </main>
    </div>
  );
}