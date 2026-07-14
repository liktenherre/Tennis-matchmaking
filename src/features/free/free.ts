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
    timeZone: 'Europe/Paris',
  });
  const day = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Paris',
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
