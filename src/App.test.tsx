import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders title and main regions', () => {
    render(<App />);
    expect(screen.getByText(/ghost town setup/i)).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('clicking Generate fills the board', () => {
    render(<App />);
    const generateBtn = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(generateBtn);
    // After generation, at least some cells should be filled (icons present).
    const cells = screen.getAllByRole('gridcell');
    const filled = cells.filter((c) => c.textContent && c.textContent.trim() !== '');
    expect(filled.length).toBeGreaterThan(0);
  });

  it('changing size rebuilds the grid', () => {
    render(<App />);
    const sizeInput = screen.getByLabelText(/size/i);
    fireEvent.change(sizeInput, { target: { value: '5' } });
    expect(screen.getAllByRole('gridcell')).toHaveLength(25);
  });

  it('shows valid state initially', () => {
    render(<App />);
    expect(screen.getByText(/setup is valid/i)).toBeInTheDocument();
  });
});