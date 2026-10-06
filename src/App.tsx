import { useState } from 'react';
import type { ActiveTile } from './types';
import { useGrid } from './hooks/useGrid';
import { Board } from './components/Board';
import { TilePalette } from './components/TilePalette';
import { Controls } from './components/Controls';
import { Violations } from './components/Violations';
import './App.css';

export default function App() {
  const [players, setPlayers] = useState(2);
  const [active, setActive] = useState<ActiveTile | null>(null);
  const { grid, violations, error, place, remove, clear, resize, generate } = useGrid();

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
        <h1>Ghost Town Setup</h1>
        <Controls
          players={players}
          size={grid.length}
          onPlayersChange={setPlayers}
          onSizeChange={handleSizeChange}
          onGenerate={() => generate(players)}
          onClear={clear}
        />
      </header>
      <main className="app-main">
        <TilePalette active={active} onSelect={setActive} />
        <Board
          grid={grid}
          violations={violations}
          activeTile={active ?? { type: 'grave' }}
          onPlace={handlePlace}
          onRemove={remove}
        />
        <Violations violations={violations} error={error} />
      </main>
    </div>
  );
}