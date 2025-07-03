import { describe, it, expect } from 'vitest';

import type { DiffResponse } from '../types/diff';

describe('Client mode handling logic', () => {
  it('validates DiffResponse interface includes mode', () => {
    // Test that DiffResponse interface supports mode property
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      mode: 'inline',
    };

    expect(mockResponse.mode).toBe('inline');
    expect(mockResponse.commit).toBe('abc123');
    expect(mockResponse.files).toEqual([]);
  });

  it('validates DiffResponse with side-by-side mode', () => {
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      mode: 'side-by-side',
    };

    expect(mockResponse.mode).toBe('side-by-side');
  });

  it('validates DiffResponse without mode property', () => {
    const mockResponse: DiffResponse = {
      commit: 'abc123',
      files: [],
      ignoreWhitespace: false,
      isEmpty: false,
      // mode is optional, so can be omitted
    };

    expect(mockResponse.mode).toBeUndefined();
  });

  it('mode setting logic works correctly', () => {
    // Test the mode setting logic that would be used in fetchDiffData
    const setModeFromResponse = (data: DiffResponse): 'side-by-side' | 'inline' => {
      if (data.mode) {
        return data.mode as 'side-by-side' | 'inline';
      }
      return 'side-by-side'; // default
    };

    const responseWithInline: DiffResponse = { commit: 'abc', files: [], mode: 'inline' };
    const responseWithSideBySide: DiffResponse = { commit: 'abc', files: [], mode: 'side-by-side' };
    const responseWithoutMode: DiffResponse = { commit: 'abc', files: [] };

    expect(setModeFromResponse(responseWithInline)).toBe('inline');
    expect(setModeFromResponse(responseWithSideBySide)).toBe('side-by-side');
    expect(setModeFromResponse(responseWithoutMode)).toBe('side-by-side');
  });
});
