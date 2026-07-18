// Free window display helpers (Paris presets + card copy). Ranking stays in SQL.

export type FreePreset = 'today_am' | 'today_pm' | 'tomorrow_am' | 'tomorrow_pm' | 'custom';

export type FreeCard = {
  windowId: string;
  userId: string;
  firstName: string;
  distanceKm: number;
  level: string;
  formats: string[];
  startsAt: string;
  endsAt: string;
  areaLabel: string;
  courtNames: string[];
  overlapMinutes: number;
  sharedCourtCount: number;
  interested: boolean;
};

export type FreeWindow = {
  id: string;
  startsAt: string;
  endsAt: string;
  courtNames: string[];
  areaLabel: string;
  createdAt: string;
};

export type InboundInterest = {
  fromUserId: string;
  firstName: string;
  level: string;
  formats: string[];
  createdAt: string;
  accepted: boolean;
};

export type MyFreeState = {
  window: FreeWindow | null;
  inbound: InboundInterest[];
};

export type MatchSessionState = {
  matchId: string;
  confirmedBy: string[];
  playedAt: string | null;
  founderMediated: boolean;
  iConfirmed: boolean;
};

export const FREE_PRESETS: Exclude<FreePreset, 'custom'>[] = [
  'today_am',
  'today_pm',
  'tomorrow_am',
  'tomorrow_pm',
];

const PARIS_TZ = 'Europe/Paris';

const pad2 = (value: number) => String(value).padStart(2, '0');

const parisYmd = (now: Date, dayOffset = 0) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
};

// Mirrors SQL paris_free_preset_bounds: wall clock in Europe/Paris → UTC instant.
const parisWallTimeToUtc = (ymd: string, hour: number, minute: number) => {
  const desiredAsUtcMs = Date.UTC(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(5, 7)) - 1,
    Number(ymd.slice(8, 10)),
    hour,
    minute,
    0,
  );
  let utcMs = desiredAsUtcMs;
  for (let i = 0; i < 2; i += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: PARIS_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utcMs));
    const asZoneMs = Date.UTC(
      Number(parts.find((part) => part.type === 'year')?.value),
      Number(parts.find((part) => part.type === 'month')?.value) - 1,
      Number(parts.find((part) => part.type === 'day')?.value),
      Number(parts.find((part) => part.type === 'hour')?.value),
      Number(parts.find((part) => part.type === 'minute')?.value),
      Number(parts.find((part) => part.type === 'second')?.value),
    );
    utcMs += desiredAsUtcMs - asZoneMs;
  }
  return new Date(utcMs);
};

const PRESET_HOURS: Record<
  Exclude<FreePreset, 'custom'>,
  { dayOffset: number; startHour: number; endHour: number }
> = {
  today_am: { dayOffset: 0, startHour: 8, endHour: 12 },
  today_pm: { dayOffset: 0, startHour: 14, endHour: 20 },
  tomorrow_am: { dayOffset: 1, startHour: 8, endHour: 12 },
  tomorrow_pm: { dayOffset: 1, startHour: 14, endHour: 20 },
};

export const freePresetEndsAt = (
  preset: Exclude<FreePreset, 'custom'>,
  now = new Date(),
) => {
  const spec = PRESET_HOURS[preset];
  return parisWallTimeToUtc(parisYmd(now, spec.dayOffset), spec.endHour, 0);
};

export const availableFreePresets = (now = new Date()) =>
  FREE_PRESETS.filter((preset) => freePresetEndsAt(preset, now) > now);

export const formatFreeWindowRange = (
  startsAt: string,
  endsAt: string,
  locale: string,
) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const time = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PARIS_TZ,
  });
  const day = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: PARIS_TZ,
  });
  return `${day.format(start)} · ${time.format(start)}–${time.format(end)}`;
};

export const freeCardPlaceLabel = (card: Pick<FreeCard, 'areaLabel' | 'courtNames'>) => {
  const area = card.areaLabel.trim();
  if (area) return area;
  if (card.courtNames.length > 0) return card.courtNames.slice(0, 2).join(', ');
  return '';
};

export const freeWindowStatus = (
  window: FreeWindow | null,
  now = new Date(),
): 'none' | 'active' | 'expired' => {
  if (!window) return 'none';
  if (new Date(window.endsAt) <= now) return 'expired';
  return 'active';
};
