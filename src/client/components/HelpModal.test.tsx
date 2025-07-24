import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { HelpModal } from './HelpModal';

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook');

describe('HelpModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close help modal');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the modal', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    // Click on the backdrop
    const backdrop = screen.getByText('Keyboard Shortcuts').closest('.z-50')?.firstChild;
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should register escape hotkey when open', async () => {
    const onClose = vi.fn();
    const { useHotkeys } = await import('react-hotkeys-hook');

    render(<HelpModal isOpen={true} onClose={onClose} />);

    // Check that useHotkeys was called with escape key
    expect(useHotkeys).toHaveBeenCalledWith('escape', expect.any(Function), { enabled: true }, [
      onClose,
      true,
    ]);

    // Get the handler that was registered and call it
    const calls = (useHotkeys as any).mock.calls;
    const escapeCall = calls.find((call: any) => call[0] === 'escape');
    expect(escapeCall).toBeDefined();

    // Call the handler
    escapeCall[1]();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not register escape hotkey when closed', async () => {
    const onClose = vi.fn();
    const { useHotkeys } = await import('react-hotkeys-hook');

    render(<HelpModal isOpen={false} onClose={onClose} />);

    // Check that useHotkeys was called with enabled: false
    expect(useHotkeys).toHaveBeenCalledWith('escape', expect.any(Function), { enabled: false }, [
      onClose,
      false,
    ]);
  });
});
