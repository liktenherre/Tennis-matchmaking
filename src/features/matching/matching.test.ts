// Verifies deterministic compatibility filtering and ranking edge cases.

import { describe, expect, it } from 'vitest';
import {
  compatibilityScore,
  isCompatible,
  rankCandidates,
  type DiscoveryPreferences,
  type DiscoveryProfile,
} from './matching';

const preferences: DiscoveryPreferences = {
  maximumDistanceKm: 25,
  minimumAge: 25,
  maximumAge: 45,
  levels: ['intermediate', 'advanced'],
  format: 'singles',
  availability: ['weekend_morning'],
  genderPreference: 'everyone',
};

const player = (overrides: Partial<DiscoveryProfile> = {}): DiscoveryProfile => ({
  id: 'player-a',
  firstName: 'Camille',
  age: 32,
  city: 'Nice',
  distanceKm: 6,
  level: 'intermediate',
  gender: 'woman',
  formats: ['singles'],
  availability: ['weekend_morning'],
  courtNames: ['Nice Lawn Tennis Club'],
  bio: 'Jeu régulier le week-end.',
  photoUrl: null,
  ...overrides,
});

describe('matching rules', () => {
  it('requires distance, age, level, format, and availability compatibility', () => {
    expect(isCompatible(player(), preferences)).toBe(true);
    expect(isCompatible(player({ distanceKm: 26 }), preferences)).toBe(false);
    expect(isCompatible(player({ age: 46 }), preferences)).toBe(false);
    expect(isCompatible(player({ level: 'beginner' }), preferences)).toBe(false);
    expect(isCompatible(player({ formats: ['doubles'] }), preferences)).toBe(false);
    expect(isCompatible(player({ availability: ['weekday_evening'] }), preferences)).toBe(false);
  });

  it('honors an optional gender preference without exposing it as mandatory', () => {
    expect(isCompatible(player(), { ...preferences, genderPreference: 'women' })).toBe(true);
    expect(
      isCompatible(player({ gender: 'man' }), { ...preferences, genderPreference: 'women' }),
    ).toBe(false);
    expect(
      isCompatible(
        player({ gender: 'prefer_not_to_say' }),
        { ...preferences, genderPreference: 'everyone' },
      ),
    ).toBe(true);
  });

  it('ranks nearby players with shared availability ahead of weaker fits', () => {
    const near = player({ id: 'near', distanceKm: 2, courtNames: ['A', 'B'] });
    const far = player({ id: 'far', distanceKm: 20, courtNames: [] });
    const incompatible = player({ id: 'wrong-level', level: 'beginner' });

    expect(rankCandidates([far, incompatible, near], preferences).map(({ id }) => id)).toEqual([
      'near',
      'far',
    ]);
    expect(compatibilityScore(incompatible, preferences)).toBe(Number.NEGATIVE_INFINITY);
  });
});
