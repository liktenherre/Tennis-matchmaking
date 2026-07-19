// Formats unread counts for match-row badges (null means hide).

export const formatUnreadBadge = (count: number): string | null => {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
};

/** Mirrors list_my_matches unread math for client-side checks / tests. */
export const computeUnreadCount = ({
  otherMessageCountAfterRead,
  hasOpened,
}: {
  otherMessageCountAfterRead: number;
  hasOpened: boolean;
}): number =>
  Math.max(otherMessageCountAfterRead, hasOpened ? 0 : 1);
