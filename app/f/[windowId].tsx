// Universal Link landing for Free-window invites when the full app is installed.

import { router, useLocalSearchParams } from 'expo-router';
import { use, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, DisplayTitle, Eyebrow, Screen } from '@/components/ui';
import { formatFreeWindowRange, freeCardPlaceLabel } from '@/features/free/free';
import {
  expressFreeInterest,
  fetchFreeWindowInvite,
  type FreeInviteCard,
} from '@/features/free/free-service';
import { getErrorMessage } from '@/lib/errors';
import { clearPendingClipWindowId } from '@/lib/clip-session';
import { SessionContext } from '@/providers/session-provider';
import { colors } from '@/theme';
import { Text, View } from '@/tw';

export default function FreeInviteScreen() {
  const { t, i18n } = useTranslation();
  const { windowId: rawId } = useLocalSearchParams<{ windowId: string }>();
  const windowId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { session, isLoading, isOnboarded } = use(SessionContext);
  const [card, setCard] = useState<FreeInviteCard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!windowId) return;
    let mounted = true;
    void fetchFreeWindowInvite(windowId)
      .then((invite) => {
        if (mounted) setCard(invite);
      })
      .catch((inviteError) => {
        if (mounted) setError(getErrorMessage(inviteError, t('free.inviteUnavailable')));
      });
    return () => {
      mounted = false;
    };
  }, [windowId, t]);

  useEffect(() => {
    if (session && isOnboarded) clearPendingClipWindowId();
  }, [session, isOnboarded]);

  const interest = async () => {
    if (!windowId) return;
    setBusy(true);
    setError('');
    try {
      await expressFreeInterest(windowId);
      setDone(true);
    } catch (interestError) {
      setError(getErrorMessage(interestError, t('free.interestError')));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || (!card && !error)) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="gap-2">
        <Eyebrow tone="lime">{t('free.eyebrow')}</Eyebrow>
        <DisplayTitle>{t('free.inviteTitle')}</DisplayTitle>
      </View>

      {error && !card ? (
        <Text className="font-sans text-[16px] text-danger">{error}</Text>
      ) : null}

      {card ? (
        <View className="gap-3 border border-border border-l-4 border-l-lime bg-surface p-4">
          <Text className="font-display text-[28px] leading-none text-ink">
            {card.firstName}
          </Text>
          <Text className="font-sans-semibold text-[17px] text-ink">
            {formatFreeWindowRange(card.startsAt, card.endsAt, i18n.language)}
          </Text>
          {freeCardPlaceLabel(card) ? (
            <Text className="font-sans text-[15px] text-muted2">{freeCardPlaceLabel(card)}</Text>
          ) : null}
          <Text className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {t(`onboarding.${card.level}`)}
          </Text>
        </View>
      ) : null}

      {error ? <Text className="font-sans text-[15px] text-danger">{error}</Text> : null}

      {!session ? (
        <>
          <Text className="font-sans text-[15px] text-muted2">{t('free.inviteSignIn')}</Text>
          <Button label={t('common.continue')} onPress={() => router.replace('/sign-in')} />
        </>
      ) : !isOnboarded ? (
        <Button label={t('common.continue')} onPress={() => router.replace('/onboarding')} />
      ) : done ? (
        <Button label={t('matches.title')} onPress={() => router.replace('/matches')} variant="lime" />
      ) : (
        <Button
          label={t('free.interested')}
          onPress={() => void interest()}
          loading={busy}
          variant="lime"
        />
      )}
    </Screen>
  );
}
