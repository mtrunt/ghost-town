import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CellView } from './Cell';

describe('CellView', () => {
  it('renders empty cell', () => {
    render(<CellView row={1} col={2} cell={null} violating={false} activeTile={{ type: 'grave' }} onPlace={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('gridcell', { name: /1,2/i })).toBeInTheDocument();
  });

  it('renders tile icon', () => {
    render(<CellView row={0} col={0} cell={{ tile: 'grave' }} violating={false} activeTile={{ type: 'grave' }} onPlace={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('⚰️')).toBeInTheDocument();
  });

  it('clicking empty cell calls onPlace', () => {
    const onPlace = vi.fn();
    render(<CellView row={1} col={1} cell={null} violating={false} activeTile={{ type: 'grave' }} onPlace={onPlace} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByRole('gridcell'));
    expect(onPlace).toHaveBeenCalledWith(1, 1);
  });

  it('clicking occupied cell calls onRemove', () => {
    const onRemove = vi.fn();
    render(<CellView row={1} col={1} cell={{ tile: 'grave' }} violating={false} activeTile={{ type: 'grave' }} onPlace={vi.fn()} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('gridcell'));
    expect(onRemove).toHaveBeenCalledWith(1, 1);
  });

  it('violating cell has violating class', () => {
    render(<CellView row={1} col={1} cell={{ tile: 'start' }} violating={true} activeTile={{ type: 'grave' }} onPlace={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('gridcell')).toHaveClass('violating');
  });
});