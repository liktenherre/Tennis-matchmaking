// Defines discovery profile types and pure compatibility-ranking rules.

export type TennisLevel = 'beginner' | 'intermediate' | 'advanced' | 'competition';
export type MatchFormat = 'singles' | 'doubles' | 'either';

export type DiscoveryProfile = {
  id: string;
  firstName: string;
  age: number;
  city: string;
  distanceKm: number;
  level: TennisLevel;
  gender: 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';
  formats: MatchFormat[];
  availability: string[];
  courtNames: string[];
  bio: string;
  photoUrl: string | null;
};

export type DiscoveryPreferences = {
  maximumDistanceKm: number;
  minimumAge: number;
  maximumAge: number;
  levels: TennisLevel[];
  format: MatchFormat;
  availability: string[];
  genderPreference: 'women' | 'men' | 'everyone';
};

const overlapCount = <T,>(left: T[], right: T[]) =>
  left.filter((value) => right.includes(value)).length;

export const isCompatible = (
  profile: DiscoveryProfile,
  preferences: DiscoveryPreferences,
) =>
  profile.distanceKm <= preferences.maximumDistanceKm &&
  profile.age >= preferences.minimumAge &&
  profile.age <= preferences.maximumAge &&
  preferences.levels.includes(profile.level) &&
  (preferences.genderPreference === 'everyone' ||
    (preferences.genderPreference === 'women' && profile.gender === 'woman') ||
    (preferences.genderPreference === 'men' && profile.gender === 'man')) &&
  (preferences.format === 'either' ||
    profile.formats.includes('either') ||
    profile.formats.includes(preferences.format)) &&
  (preferences.availability.length === 0 ||
    overlapCount(profile.availability, preferences.availability) > 0);

export const compatibilityScore = (
  profile: DiscoveryProfile,
  preferences: DiscoveryPreferences,
) => {
  if (!isCompatible(profile, preferences)) return Number.NEGATIVE_INFINITY;

  const distanceScore =
    40 * (1 - profile.distanceKm / Math.max(preferences.maximumDistanceKm, 1));
  const availabilityScore =
    15 * overlapCount(profile.availability, preferences.availability);
  const courtScore = Math.min(profile.courtNames.length, 2) * 5;

  return Math.round(distanceScore + availabilityScore + courtScore);
};

export const rankCandidates = (
  profiles: DiscoveryProfile[],
  preferences: DiscoveryPreferences,
) =>
  profiles
    .filter((profile) => isCompatible(profile, preferences))
    .sort(
      (left, right) =>
        compatibilityScore(right, preferences) -
        compatibilityScore(left, preferences),
    );
