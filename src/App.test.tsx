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

  it('displays share code after generating', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const codeInput = screen.getByPlaceholderText(/code/i) as HTMLInputElement;
    expect(codeInput).toBeInTheDocument();
    expect(codeInput.value).toMatch(/^[0-9a-zA-Z]{6}$/);
  });

  it('does not display share code before generating', () => {
    render(<App />);
    const codeInput = screen.getByPlaceholderText(/code/i) as HTMLInputElement;
    expect(codeInput.value).toBe('');
  });

  it('renders load input and load button', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /copy board code/i })).toBeInTheDocument();
  });

  it('loading a valid code reconstructs the board', () => {
    render(<App />);
    // Generate to get a code
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const codeInput = screen.getByPlaceholderText(/code/i) as HTMLInputElement;
    const code = codeInput.value;
    // Clear the board
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    // Load the code
    fireEvent.change(codeInput, { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: /load/i }));
    // Board should be filled again
    const cells = screen.getAllByRole('gridcell');
    const filled = cells.filter((c) => c.textContent && c.textContent.trim() !== '');
    expect(filled.length).toBeGreaterThan(0);
    // Code should remain in the input
    expect((screen.getByPlaceholderText(/code/i) as HTMLInputElement).value).toBe(code);
  });

  it('loading an invalid code shows an error', () => {
    render(<App />);
    const loadInput = screen.getByPlaceholderText(/code/i);
    fireEvent.change(loadInput, { target: { value: '!!!' } });
    fireEvent.click(screen.getByRole('button', { name: /load/i }));
    expect(screen.getByText(/invalid board code/i)).toBeInTheDocument();
  });
});