import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useWordHighlight } from './useWordHighlight';

describe('useWordHighlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should initialize with no highlighted word', () => {
    const { result } = renderHook(() => useWordHighlight());

    expect(result.current.highlightedWord).toBeNull();
    expect(result.current.isWordHighlighted('test')).toBe(false);
  });

  it('should highlight word on mouse over after delay', () => {
    const { result } = renderHook(() => useWordHighlight());

    const mockEvent = {
      target: {
        textContent: 'hello world',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 110, // 'hello world' = 11 chars * 10px per char
          height: 20,
        })),
      },
      clientX: 25, // Position over 'hello'
      clientY: 10,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
    });

    // Should not highlight immediately
    expect(result.current.highlightedWord).toBeNull();

    // After delay, should highlight
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('hello');
    expect(result.current.isWordHighlighted('hello')).toBe(true);
    expect(result.current.isWordHighlighted('world')).toBe(false);
  });

  it('should clear highlight on mouse out', () => {
    const { result } = renderHook(() => useWordHighlight());

    // First, set a highlighted word
    const mockEvent = {
      target: {
        textContent: 'hello',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 10,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('hello');

    // Then mouse out
    act(() => {
      result.current.handleMouseOut();
    });

    expect(result.current.highlightedWord).toBeNull();
  });

  it('should cancel pending highlight on mouse out', () => {
    const { result } = renderHook(() => useWordHighlight());

    const mockEvent = {
      target: {
        textContent: 'hello',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 10,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
    });

    // Mouse out before delay
    act(() => {
      result.current.handleMouseOut();
    });

    // Advance time - should not highlight
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBeNull();
  });

  it('should detect word at cursor position', () => {
    const { result } = renderHook(() => useWordHighlight());

    // For single word, should always highlight it
    const mockEvent = {
      target: {
        textContent: 'hello',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 25,
      clientY: 10,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('hello');
  });

  it('should normalize word for case-insensitive comparison', () => {
    const { result } = renderHook(() => useWordHighlight());

    const mockEvent = {
      target: {
        textContent: 'Hello',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 10,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('hello');
    expect(result.current.isWordHighlighted('Hello')).toBe(true);
    expect(result.current.isWordHighlighted('HELLO')).toBe(true);
    expect(result.current.isWordHighlighted('hello')).toBe(true);
  });

  it('should not highlight if target is not a word token element', () => {
    const { result } = renderHook(() => useWordHighlight());

    const mockEvent = {
      target: {
        textContent: 'hello',
        classList: { contains: vi.fn(() => false) }, // Not a word token
      },
      clientX: 10,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(mockEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBeNull();
  });

  it('should update highlight when moving to different word', () => {
    const { result } = renderHook(() => useWordHighlight());

    // First word
    const firstEvent = {
      target: {
        textContent: 'hello',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 10,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(firstEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('hello');

    // Move to second word
    const secondEvent = {
      target: {
        textContent: 'world',
        classList: { contains: vi.fn(() => true) },
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 50,
          height: 20,
        })),
      },
      clientX: 25,
      clientY: 20,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseOver(secondEvent);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.highlightedWord).toBe('world');
  });
});
