// Regression coverage for onboarding format chip exclusivity.

import { describe, expect, it } from 'vitest';
import { toggleMatchFormats } from './formats';

describe('toggleMatchFormats', () => {
  // Regression: ISSUE-003 — Singles and Both could both stay selected.
  // Found by /qa on 2026-07-18
  // Report: .gstack/qa-reports/qa-report-localhost-2026-07-18.md
  it('clears Both when Singles or Doubles is chosen', () => {
    expect(toggleMatchFormats(['either'], 'singles')).toEqual(['singles']);
    expect(toggleMatchFormats(['singles'], 'doubles')).toEqual(['singles', 'doubles']);
    expect(toggleMatchFormats(['singles', 'doubles'], 'either')).toEqual(['either']);
  });

  it('falls back to Both when the last concrete format is cleared', () => {
    expect(toggleMatchFormats(['singles'], 'singles')).toEqual(['either']);
  });
});
