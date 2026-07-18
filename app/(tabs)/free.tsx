// Free tab: post a window, browse who’s free nearby, inbound Accept.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Chip, DisplayTitle, Eyebrow, Field, Screen } from '@/components/ui';
import {
  availableFreePresets,
  formatFreeWindowRange,
  freeCardPlaceLabel,
  freeWindowStatus,
  type FreeCard,
  type FreePreset,
  type InboundInterest,
  type FreeWindow,
} from '@/features/free/free';
import {
  acceptFreeInterest,
  cancelFreeWindow,
  expressFreeInterest,
  fetchMyFreeWindow,
  listFreeNearby,
  postFreeWindow,
} from '@/features/free/free-service';
import { track } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors';
import { colors } from '@/theme';
import { Pressable, Text, View } from '@/tw';

export default function FreeScreen() {
  const { t, i18n } = useTranslation();
  const presets = useMemo(() => availableFreePresets(), []);
  const [myWindow, setMyWindow] = useState<FreeWindow | null>(null);
  const [inbound, setInbound] = useState<InboundInterest[]>([]);
  const [nearby, setNearby] = useState<FreeCard[]>([]);
  const [preset, setPreset] = useState<Exclude<FreePreset, 'custom'>>(
    () => availableFreePresets()[0] ?? 'tomorrow_am',
  );
  const [areaLabel, setAreaLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  // Keeps selection on a still-open Paris slot when today_am/pm roll off.
  useEffect(() => {
    if (presets.length > 0 && !presets.includes(preset)) {
      setPreset(presets[0]);
    }
  }, [presets, preset]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [mine, cards] = await Promise.all([fetchMyFreeWindow(), listFreeNearby()]);
      setMyWindow(mine.window);
      setInbound(mine.inbound);
      setNearby(cards);
      void track('discovery_loaded', { surface: 'free', candidateCount: cards.length });
    } catch (loadError) {
      setNearby([]);
      setError(getErrorMessage(loadError, t('free.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const status = freeWindowStatus(myWindow);
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';

  const post = async () => {
    if (!presets.includes(preset)) {
      setError(t('free.presetEnded'));
      return;
    }
    setIsPosting(true);
    setError('');
    try {
      await postFreeWindow({ preset, areaLabel });
      await load();
    } catch (postError) {
      setError(getErrorMessage(postError, t('free.postError')));
    } finally {
      setIsPosting(false);
    }
  };

  const cancel = async () => {
    try {
      await cancelFreeWindow();
      await load();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, t('free.postError')));
    }
  };

  const interest = async (card: FreeCard) => {
    setBusyId(card.windowId);
    try {
      await expressFreeInterest(card.windowId);
      setNearby((items) =>
        items.map((item) =>
          item.windowId === card.windowId ? { ...item, interested: true } : item,
        ),
      );
    } catch (interestError) {
      setError(getErrorMessage(interestError, t('free.interestError')));
    } finally {
      setBusyId('');
    }
  };

  const accept = async (item: InboundInterest) => {
    if (!myWindow) return;
    setBusyId(item.fromUserId);
    try {
      const result = await acceptFreeInterest(myWindow.id, item.fromUserId);
      Alert.alert(
        t('free.acceptTitle'),
        t('free.acceptBody', { name: result.other_first_name }),
      );
      router.push(`/chat/${result.match_id}`);
    } catch (acceptError) {
      setError(getErrorMessage(acceptError, t('free.acceptError')));
    } finally {
      setBusyId('');
    }
  };

  if (isLoading) {
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
        <DisplayTitle>{t('free.title')}</DisplayTitle>
        <Text className="font-sans text-[16px] text-muted2">{t('free.subtitle')}</Text>
      </View>

      <View className="gap-3 border border-border bg-surface p-4">
        <Eyebrow>{t('free.yourWindow')}</Eyebrow>
        {status === 'active' && myWindow ? (
          <>
            <Text className="font-display text-[28px] leading-none text-ink">
              {formatFreeWindowRange(myWindow.startsAt, myWindow.endsAt, locale)}
            </Text>
            {myWindow.areaLabel || myWindow.courtNames.length > 0 ? (
              <Text className="font-sans text-[15px] text-muted2">
                {freeCardPlaceLabel(myWindow) || myWindow.courtNames.slice(0, 2).join(', ')}
              </Text>
            ) : null}
            <Button label={t('free.cancelWindow')} onPress={() => void cancel()} variant="secondary" />
          </>
        ) : (
          <>
            <Text className="font-sans text-[15px] text-muted2">
              {status === 'expired' ? t('free.expiredHint') : t('free.noWindowHint')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {presets.length === 0 ? (
                <Text className="font-sans text-[15px] text-muted2">{t('free.noOpenPresets')}</Text>
              ) : (
                presets.map((value) => (
                  <Chip
                    key={value}
                    label={t(`free.presets.${value}`)}
                    selected={preset === value}
                    onPress={() => setPreset(value)}
                  />
                ))
              )}
            </View>
            <Field
              label={t('free.areaLabel')}
              value={areaLabel}
              onChangeText={(value) => setAreaLabel(value.slice(0, 80))}
              placeholder={t('free.areaPlaceholder')}
            />
            <Button
              label={t('free.post')}
              onPress={() => void post()}
              loading={isPosting}
              variant="lime"
            />
          </>
        )}
      </View>

      {status === 'active' && inbound.length > 0 ? (
        <View className="gap-3">
          <Eyebrow tone="lime">{t('free.inbound')}</Eyebrow>
          {inbound.map((item) => (
            <View
              key={item.fromUserId}
              className="flex-row items-center justify-between gap-3 border border-border bg-surface p-4"
            >
              <View className="flex-1 gap-1">
                <Text className="font-sans-bold text-[17px] text-ink">{item.firstName}</Text>
                <Text className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {t(`onboarding.${item.level}`)}
                </Text>
              </View>
              {item.accepted ? (
                <Text className="font-sans-semibold text-[14px] text-muted">{t('free.accepted')}</Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('free.accept')}
                  disabled={busyId === item.fromUserId}
                  onPress={() => void accept(item)}
                  className="min-h-11 items-center justify-center bg-lime px-4 active:opacity-80"
                >
                  <Text className="font-sans-bold text-ink">{t('free.accept')}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <Eyebrow>{t('free.nearby')}</Eyebrow>
        {error && nearby.length === 0 ? (
          <View className="gap-3 border border-dashed border-border p-4">
            <Text className="font-display text-[28px] leading-none text-ink">
              {t('free.loadTitle')}
            </Text>
            <Text className="font-sans text-[15px] text-muted2">{t('free.loadHint')}</Text>
            <Button label={t('free.retry')} onPress={() => void load()} variant="secondary" />
          </View>
        ) : nearby.length === 0 ? (
          <View className="gap-3 border border-dashed border-border p-4">
            <Text className="font-display text-[28px] leading-none text-ink">
              {t('free.emptyTitle')}
            </Text>
            <Text className="font-sans text-[15px] text-muted2">{t('free.emptyBody')}</Text>
            {status !== 'active' ? (
              <Button label={t('free.post')} onPress={() => void post()} variant="lime" />
            ) : null}
          </View>
        ) : (
          nearby.map((card) => {
            const place = freeCardPlaceLabel(card);
            return (
              <View
                key={card.windowId}
                className="gap-3 border border-border bg-surface p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="font-sans-bold text-[18px] text-ink">
                      {card.firstName}
                      <Text className="font-sans text-muted">
                        {' '}
                        · {card.distanceKm} km · {t(`onboarding.${card.level}`)}
                      </Text>
                    </Text>
                    <Text className="font-sans text-[15px] text-muted2">
                      {formatFreeWindowRange(card.startsAt, card.endsAt, locale)}
                      {place ? ` · ${place}` : ''}
                    </Text>
                  </View>
                  {card.interested ? (
                    <Text className="font-sans-semibold text-[13px] text-muted">
                      {t('free.pending')}
                    </Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('free.interested')}
                      disabled={busyId === card.windowId}
                      onPress={() => void interest(card)}
                      className="min-h-11 items-center justify-center bg-ink px-3 active:opacity-80"
                    >
                      <Text className="font-sans-bold text-canvas">{t('free.interested')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {error ? (
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
          {error}
        </Text>
      ) : null}

      <Pressable accessibilityRole="link" onPress={() => router.push('/discover')}>
        <Text className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {t('free.swipeFallback')}
        </Text>
      </Pressable>
    </Screen>
  );
}
