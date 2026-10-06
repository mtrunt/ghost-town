import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Violations } from './Violations';

describe('Violations', () => {
  it('shows valid message when no violations and no error', () => {
    render(<Violations violations={[]} error={null} />);
    expect(screen.getByText(/setup is valid/i)).toBeInTheDocument();
  });

  it('shows error when present', () => {
    render(<Violations violations={[]} error="No valid setup found." />);
    expect(screen.getByText(/no valid setup found/i)).toBeInTheDocument();
  });

  it('lists violations', () => {
    render(<Violations violations={[
      { row: 0, col: 3, message: 'Start on edge' },
      { row: -1, col: -1, message: 'Not accessible' },
    ]} error={null} />);
    expect(screen.getByText(/start on edge/i)).toBeInTheDocument();
    expect(screen.getByText(/not accessible/i)).toBeInTheDocument();
  });
});