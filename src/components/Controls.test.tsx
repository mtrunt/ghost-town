import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from './Controls';
import type { PortalSettings } from '../types';

const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  noPizzaAdjacent: true,
  pizzaAdjacencyMetric: 'chebyshev',
  minDistance: null,
};

describe('Controls', () => {
  it('renders player count select', () => {
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('renders size input', () => {
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    expect(screen.getByLabelText(/size/i)).toHaveValue(7);
  });

  it('changing player count calls handler', () => {
    const onPlayersChange = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={onPlayersChange} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/players/i), { target: { value: '3' } });
    expect(onPlayersChange).toHaveBeenCalledWith(3);
  });

  it('changing size calls handler', () => {
    const onSizeChange = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={onSizeChange} onGenerate={vi.fn()} onClear={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/size/i), { target: { value: '8' } });
    expect(onSizeChange).toHaveBeenCalledWith(8);
  });

  it('clicking Generate calls handler', () => {
    const onGenerate = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={onGenerate} onClear={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('clicking Clear calls handler', () => {
    const onClear = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onGenerate={vi.fn()} onClear={onClear} onPortalSettingsChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('Controls portal settings', () => {
  it('renders the portal-pizza adjacency checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders the metric select when adjacency is enabled', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/adjacency metric/i)).toBeInTheDocument();
  });

  it('does not render the metric select when adjacency is disabled', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, noPizzaAdjacent: false };
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/adjacency metric/i)).not.toBeInTheDocument();
  });

  it('toggling adjacency checkbox calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to pizza/i);
    fireEvent.click(checkbox);
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      noPizzaAdjacent: false,
    });
  });

  it('changing metric select calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/adjacency metric/i), { target: { value: 'manhattan' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      pizzaAdjacencyMetric: 'manhattan',
    });
  });

  it('renders min-distance checkbox unchecked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/min portal distance/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('enabling min distance defaults threshold to 2', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/min portal distance/i));
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      minDistance: 2,
    });
  });

  it('renders threshold select when min distance is enabled', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 3 };
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/min distance threshold/i)).toHaveValue('3');
  });

  it('changing threshold select calls onPortalSettingsChange', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 2 };
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/min distance threshold/i), { target: { value: '4' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...settings,
      minDistance: 4,
    });
  });

  it('disabling min distance sets minDistance to null', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 3 };
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        onGenerate={vi.fn()} onClear={vi.fn()}
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/min portal distance/i));
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...settings,
      minDistance: null,
    });
  });
});