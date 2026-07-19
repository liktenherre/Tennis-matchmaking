// Guards unread badge formatting and match-open sentinel logic.

import { describe, expect, it } from 'vitest';
import { computeUnreadCount, formatUnreadBadge } from './unread';

describe('formatUnreadBadge', () => {
  it('hides non-positive counts', () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-1)).toBeNull();
  });

  it('shows exact counts under 100 and caps above', () => {
    expect(formatUnreadBadge(1)).toBe('1');
    expect(formatUnreadBadge(12)).toBe('12');
    expect(formatUnreadBadge(100)).toBe('99+');
  });
});

describe('computeUnreadCount', () => {
  it('shows 1 for a never-opened match with no messages', () => {
    expect(computeUnreadCount({ otherMessageCountAfterRead: 0, hasOpened: false })).toBe(1);
  });

  it('counts other-user messages when never opened', () => {
    expect(computeUnreadCount({ otherMessageCountAfterRead: 3, hasOpened: false })).toBe(3);
  });

  it('clears when opened with no new messages', () => {
    expect(computeUnreadCount({ otherMessageCountAfterRead: 0, hasOpened: true })).toBe(0);
  });

  it('keeps new message counts after open', () => {
    expect(computeUnreadCount({ otherMessageCountAfterRead: 2, hasOpened: true })).toBe(2);
  });
});
