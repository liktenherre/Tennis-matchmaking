// Covers getErrorMessage for Error instances and Postgrest-style plain objects.

import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  // Regression: ISSUE-002 — Supabase errors were swallowed as generic Free copy.
  // Found by /qa on 2026-07-18
  // Report: .gstack/qa-reports/qa-report-localhost-2026-07-18.md
  it('reads message from Error and plain { message } objects', () => {
    expect(getErrorMessage(new Error('Free window already ended'), 'fallback')).toBe(
      'Free window already ended',
    );
    expect(getErrorMessage({ message: 'Complete onboarding first' }, 'fallback')).toBe(
      'Complete onboarding first',
    );
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
