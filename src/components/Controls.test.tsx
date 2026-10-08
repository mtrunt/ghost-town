import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from './Controls';
import type { PortalSettings } from '../types';

const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  noPizzaAdjacent: true,
  pizzaAdjacencyMetric: 'chebyshev',
  noMailboxAdjacent: true,
  minDistance: 3,
  mailboxMinDistance: true,
};

describe('Controls', () => {
  it('renders player count select', () => {
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('renders size input', () => {
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    expect(screen.getByLabelText(/size/i)).toHaveValue(7);
  });

  it('changing player count calls handler', () => {
    const onPlayersChange = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={onPlayersChange} onSizeChange={vi.fn()} onPortalSettingsChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/players/i), { target: { value: '3' } });
    expect(onPlayersChange).toHaveBeenCalledWith(3);
  });

  it('changing size calls handler', () => {
    const onSizeChange = vi.fn();
    render(<Controls players={2} size={7} portalSettings={DEFAULT_PORTAL_SETTINGS} onPlayersChange={vi.fn()} onSizeChange={onSizeChange} onPortalSettingsChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/size/i), { target: { value: '8' } });
    expect(onSizeChange).toHaveBeenCalledWith(8);
  });
});

describe('Controls portal settings', () => {
  it('renders the portal-pizza adjacency checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
       
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
       
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/adjacency metric/i), { target: { value: 'manhattan' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      pizzaAdjacencyMetric: 'manhattan',
    });
  });

  it('renders min-distance checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
       
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/min portal distance/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders threshold select with default value 3 when min distance is enabled', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
       
        onPortalSettingsChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/min distance threshold/i)).toHaveValue('3');
  });

  it('disabling min distance sets minDistance to null', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
       
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(/min portal distance/i));
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      minDistance: null,
    });
  });

  it('renders threshold select when min distance is enabled', () => {
    const settings = { ...DEFAULT_PORTAL_SETTINGS, minDistance: 3 };
    render(
      <Controls
        players={2} size={7}
        portalSettings={settings}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
       
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
        
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/min distance threshold/i), { target: { value: '4' } });
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...settings,
      minDistance: 4,
    });
  });

  it('renders the portals-not-adjacent-to-houses checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to houses/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('toggling houses-adjacency checkbox calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    const checkbox = screen.getByLabelText(/portals not adjacent to houses/i);
    fireEvent.click(checkbox);
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      noMailboxAdjacent: false,
    });
  });

  it('renders the mailbox-min-distance checkbox checked by default', () => {
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        
        onPortalSettingsChange={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/mailbox min distance from matching pizza/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('toggling mailbox-min-distance checkbox calls onPortalSettingsChange', () => {
    const onPortalSettingsChange = vi.fn();
    render(
      <Controls
        players={2} size={7}
        portalSettings={DEFAULT_PORTAL_SETTINGS}
        onPlayersChange={vi.fn()} onSizeChange={vi.fn()}
        
        onPortalSettingsChange={onPortalSettingsChange}
      />,
    );
    const checkbox = screen.getByLabelText(/mailbox min distance from matching pizza/i);
    fireEvent.click(checkbox);
    expect(onPortalSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_PORTAL_SETTINGS,
      mailboxMinDistance: false,
    });
  });
});