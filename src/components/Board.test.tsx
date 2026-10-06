import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from './Board';
import { createEmptyGrid } from '../engine/grid-helpers';

describe('Board', () => {
  it('renders N×N cells', () => {
    render(
      <Board
        grid={createEmptyGrid(5)}
        violations={[]}
        activeTile={{ type: 'grave' }}
        onPlace={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(25);
  });

  it('clicking a cell calls onPlace with coords', () => {
    const onPlace = vi.fn();
    render(
      <Board
        grid={createEmptyGrid(3)}
        violations={[]}
        activeTile={{ type: 'grave' }}
        onPlace={onPlace}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('gridcell')[4]); // row 1, col 1
    expect(onPlace).toHaveBeenCalledWith(1, 1);
  });
});