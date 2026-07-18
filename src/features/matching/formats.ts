// Keeps onboarding format chips mutually exclusive: Both vs Singles/Doubles.

import type { MatchFormat } from './matching';

export const toggleMatchFormats = (
  formats: MatchFormat[],
  value: MatchFormat,
): MatchFormat[] => {
  if (value === 'either') return ['either'];

  const withoutEither = formats.filter((format) => format !== 'either');
  const next = withoutEither.includes(value)
    ? withoutEither.filter((format) => format !== value)
    : [...withoutEither, value];

  return next.length === 0 ? ['either'] : next;
};
