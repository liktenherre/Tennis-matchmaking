// Lists mutual matches and refreshes when conversations change.

import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DisplayTitle, Eyebrow } from '@/components/ui';
import { fetchMatches, type MatchSummary } from '@/features/chat/chat-service';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { FlatList, Pressable, Text, View } from '@/tw';
import { Image } from '@/tw/image';

export default function MatchesScreen() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setMatches(await fetchMatches());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('matches.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('match-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, load)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={matches}
      keyExtractor={(item) => item.id}
      className="flex-1 bg-canvas"
      contentContainerClassName="grow gap-2 p-6"
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center gap-3">
          <DisplayTitle className="text-center">{t('matches.emptyTitle')}</DisplayTitle>
          <Text className="text-center font-sans text-[17px] text-muted">
            {error || t('matches.empty')}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/chat/[matchId]', params: { matchId: item.id } }} asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-20 flex-row items-center gap-4 border border-border bg-surface p-4"
          >
            <Image
              source={
                item.photoUrl ??
                'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'
              }
              className="h-14 w-14 rounded-sm bg-ink object-cover"
            />
            <View className="flex-1 gap-1">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="font-display text-[26px] leading-none tracking-[0.02em] text-ink">
                  {item.firstName}
                </Text>
                <Eyebrow>Match</Eyebrow>
              </View>
              <Text numberOfLines={1} className="font-sans text-[15px] text-muted">
                {item.lastMessage ?? t('matches.greeting')}
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}
