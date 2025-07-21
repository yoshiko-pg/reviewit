import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { HelpModal } from './HelpModal';

describe('HelpModal', () => {
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

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should remove event listener when unmounted', () => {
    const onClose = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(<HelpModal isOpen={true} onClose={onClose} />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not add event listener when isOpen is false', () => {
    const onClose = vi.fn();
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    render(<HelpModal isOpen={false} onClose={onClose} />);

    // The addEventListener might be called by other components,
    // so we check if it's called with our specific handler
    const keydownCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'keydown');
    expect(keydownCalls.length).toBe(0);
  });
});
