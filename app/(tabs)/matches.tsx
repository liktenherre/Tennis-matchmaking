// Lists mutual matches and refreshes when conversations change.

import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fetchMatches, type MatchSummary } from '@/features/chat/chat-service';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.court} />
      </View>
    );
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={matches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.sm,
        backgroundColor: colors.canvas,
      }}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>
            {t('matches.emptyTitle')}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 17, textAlign: 'center' }}>
            {error || t('matches.empty')}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/chat/[matchId]', params: { matchId: item.id } }} asChild>
          <Pressable
            accessibilityRole="button"
            style={{
              minHeight: 80,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Image
              source={
                item.photoUrl ??
                'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'
              }
              style={{ width: 56, height: 56, borderRadius: radius.pill }}
              contentFit="cover"
            />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>
                {item.firstName}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.muted }}>
                {item.lastMessage ?? t('matches.greeting')}
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}
