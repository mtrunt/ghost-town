interface Props {
  players: number;
  size: number;
  onPlayersChange: (n: number) => void;
  onSizeChange: (n: number) => void;
  onGenerate: () => void;
  onClear: () => void;
}

export function Controls({
  players,
  size,
  onPlayersChange,
  onSizeChange,
  onGenerate,
  onClear,
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
      <button type="button" onClick={onGenerate}>Generate</button>
      <button type="button" onClick={onClear}>Clear</button>
    </div>
  );
}