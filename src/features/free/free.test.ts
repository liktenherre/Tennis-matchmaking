// Covers Free display helpers only — ranking eligibility stays in SQL/pgTAP.

import { describe, expect, it } from 'vitest';
import {
  availableFreePresets,
  formatFreeWindowRange,
  freeCardPlaceLabel,
  freePresetEndsAt,
  freeWindowStatus,
} from './free';

describe('free display helpers', () => {
  it('formats a Paris window range with day and times', () => {
    const label = formatFreeWindowRange(
      '2026-07-14T12:00:00.000Z',
      '2026-07-14T18:00:00.000Z',
      'en',
    );
    expect(label).toContain('·');
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it('prefers area_label over court names on Free cards', () => {
    expect(
      freeCardPlaceLabel({ areaLabel: 'Magnan', courtNames: ['Nice Lawn Tennis Club'] }),
    ).toBe('Magnan');
    expect(freeCardPlaceLabel({ areaLabel: '  ', courtNames: ['A', 'B', 'C'] })).toBe('A, B');
    expect(freeCardPlaceLabel({ areaLabel: '', courtNames: [] })).toBe('');
  });

  it('classifies window status for the Free tab state machine', () => {
    const now = new Date('2026-07-14T15:00:00.000Z');
    expect(freeWindowStatus(null, now)).toBe('none');
    expect(
      freeWindowStatus(
        {
          id: '1',
          startsAt: '2026-07-14T12:00:00.000Z',
          endsAt: '2026-07-14T18:00:00.000Z',
          courtNames: [],
          areaLabel: '',
          createdAt: '2026-07-14T10:00:00.000Z',
        },
        now,
      ),
    ).toBe('active');
    expect(
      freeWindowStatus(
        {
          id: '1',
          startsAt: '2026-07-14T08:00:00.000Z',
          endsAt: '2026-07-14T10:00:00.000Z',
          courtNames: [],
          areaLabel: '',
          createdAt: '2026-07-14T07:00:00.000Z',
        },
        now,
      ),
    ).toBe('expired');
  });

  // Regression: ISSUE-001 — expired Today AM/PM stayed selectable after Paris close.
  // Found by /qa on 2026-07-18
  // Report: .gstack/qa-reports/qa-report-localhost-2026-07-18.md
  it('hides Paris presets whose end time has already passed', () => {
    const evening = new Date('2026-07-18T19:49:00.000Z'); // 21:49 Paris
    expect(freePresetEndsAt('today_pm', evening).toISOString()).toBe(
      '2026-07-18T18:00:00.000Z',
    );
    expect(availableFreePresets(evening)).toEqual(['tomorrow_am', 'tomorrow_pm']);
    const afterNoon = new Date('2026-07-18T10:30:00.000Z'); // 12:30 Paris
    expect(availableFreePresets(afterNoon)).toEqual([
      'today_pm',
      'tomorrow_am',
      'tomorrow_pm',
    ]);
  });
});
