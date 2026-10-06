import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders title and main regions', () => {
    render(<App />);
    expect(screen.getByText(/ghost town setup/i)).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
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

  it('clicking Clear empties the board', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    const cells = screen.getAllByRole('gridcell');
    const filled = cells.filter((c) => c.textContent && c.textContent.trim() !== '');
    expect(filled.length).toBe(0);
  });

  it('changing size rebuilds the grid', () => {
    render(<App />);
    // Open settings to reveal size input
    fireEvent.click(screen.getByLabelText(/toggle settings/i));
    const sizeInput = screen.getByLabelText(/size/i);
    fireEvent.change(sizeInput, { target: { value: '5' } });
    expect(screen.getAllByRole('gridcell')).toHaveLength(25);
  });

  it('shows valid state initially', () => {
    render(<App />);
    expect(screen.getByText(/setup is valid/i)).toBeInTheDocument();
  });

  it('renders portal-pizza adjacency checkbox checked by default', () => {
    render(<App />);
    // Open settings to reveal portal settings
    fireEvent.click(screen.getByLabelText(/toggle settings/i));
    const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});