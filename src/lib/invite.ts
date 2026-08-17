// Free-window invite URLs for WhatsApp / App Clip / Universal Links.

export const INVITE_HOST = 'app.cotetennis.com';
export const APP_GROUP_ID = 'group.com.cotetennis.app';

export const CLIP_SESSION_ACCESS_TOKEN_KEY = 'clip.supabase.access_token';
export const CLIP_SESSION_REFRESH_TOKEN_KEY = 'clip.supabase.refresh_token';
export const CLIP_PENDING_WINDOW_ID_KEY = 'clip.pending_window_id';

export const freeInviteUrl = (windowId: string) =>
  `https://${INVITE_HOST}/f/${windowId}`;
