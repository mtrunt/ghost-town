import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from './Controls';

describe('Controls', () => {
  it('renders player count select', () => {
    render(<Controls players={2} size={7} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('renders size input', () => {
    render(<Controls players={2} size={7} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText(/size/i)).toHaveValue(7);
  });

  it('changing player count calls handler', () => {
    const onPlayersChange = vi.fn();
    render(<Controls players={2} size={7} onPlayersChange={onPlayersChange} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/players/i), { target: { value: '3' } });
    expect(onPlayersChange).toHaveBeenCalledWith(3);
  });

  it('changing size calls handler', () => {
    const onSizeChange = vi.fn();
    render(<Controls players={2} size={7} onPlayersChange={vi.fn()} onSizeChange={onSizeChange} onGenerate={vi.fn()} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/size/i), { target: { value: '8' } });
    expect(onSizeChange).toHaveBeenCalledWith(8);
  });

  it('clicking Generate calls handler', () => {
    const onGenerate = vi.fn();
    render(<Controls players={2} size={7} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={onGenerate} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('clicking Clear calls handler', () => {
    const onClear = vi.fn();
    render(<Controls players={2} size={7} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});