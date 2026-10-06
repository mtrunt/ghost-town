import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TilePalette } from './TilePalette';

describe('TilePalette', () => {
  it('renders all tile types', () => {
    const onSelect = vi.fn();
    render(<TilePalette active={null} onSelect={onSelect} />);
    expect(screen.getByText(/start/i)).toBeInTheDocument();
    expect(screen.getByText(/pizza/i)).toBeInTheDocument();
    expect(screen.getByText(/mailbox/i)).toBeInTheDocument();
    expect(screen.getByText(/grave/i)).toBeInTheDocument();
    expect(screen.getByText(/fence/i)).toBeInTheDocument();
    expect(screen.getByText(/teleporter/i)).toBeInTheDocument();
  });

  it('selecting a tile calls onSelect', () => {
    const onSelect = vi.fn();
    render(<TilePalette active={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/grave/i));
    expect(onSelect).toHaveBeenCalledWith({ type: 'grave' });
  });

  it('pizza expands to show variants', () => {
    render(<TilePalette active={null} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText(/pizza/i));
    expect(screen.getByText('pepper')).toBeInTheDocument();
    expect(screen.getByText(/cheese/i)).toBeInTheDocument();
    expect(screen.getByText(/pepperoni/i)).toBeInTheDocument();
  });

  it('selecting a pizza variant calls onSelect with variant', () => {
    const onSelect = vi.fn();
    render(<TilePalette active={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/pizza/i));
    fireEvent.click(screen.getByText('pepper'));
    expect(onSelect).toHaveBeenCalledWith({ type: 'pizza', variant: 'pepper' });
  });

  it('teleporter expands to show shapes', () => {
    render(<TilePalette active={null} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText(/teleporter/i));
    expect(screen.getByText(/square/i)).toBeInTheDocument();
    expect(screen.getByText(/triangle/i)).toBeInTheDocument();
    expect(screen.getByText(/circle/i)).toBeInTheDocument();
  });
});