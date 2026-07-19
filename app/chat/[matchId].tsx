// Provides realtime match chat, We played confirmation, and safety controls.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fetchMatches,
  fetchMessages,
  markMatchRead,
  sendMessage,
  type ChatMessage,
  type MatchSummary,
} from '@/features/chat/chat-service';
import {
  confirmPlayed,
  fetchMatchSession,
} from '@/features/free/free-service';
import type { MatchSessionState } from '@/features/free/free';
import { blockUser, reportUser } from '@/features/matching/matching-service';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from '@/tw';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState<MatchSessionState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  // Clears the match-list badge whenever this conversation is in focus.
  useFocusEffect(
    useCallback(() => {
      if (!matchId) return;
      void markMatchRead(matchId).catch(() => {
        // Read receipts are best-effort; chat still works if this fails.
      });
    }, [matchId]),
  );

  useEffect(() => {
    if (!matchId) return;

    void Promise.all([
      fetchMessages(matchId),
      fetchMatches(),
      supabase.auth.getUser(),
      fetchMatchSession(matchId),
    ])
      .then(([initialMessages, matches, user, matchSession]) => {
        setMessages((currentMessages) => {
          const merged = new Map(
            [...initialMessages, ...currentMessages].map((message) => [message.id, message]),
          );
          // Hermes lacks Array.prototype.toSorted — sort a copy instead.
          return [...merged.values()].sort((left, right) =>
            left.createdAt.localeCompare(right.createdAt),
          );
        });
        setMatch(matches.find((item) => item.id === matchId) ?? null);
        setUserId(user.data.user?.id ?? '');
        setSession(matchSession);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : t('matches.loadError'));
      });

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const message = payload.new;
          setMessages((items) =>
            items.some((item) => item.id === message.id)
              ? items
              : [
                  ...items,
                  {
                    id: message.id,
                    matchId: message.match_id,
                    senderId: message.sender_id,
                    body: message.body,
                    createdAt: message.created_at,
                  },
                ],
          );
          void markMatchRead(matchId).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, t]);

  const send = async () => {
    if (!matchId || !body.trim()) return;
    const nextBody = body.trim();
    setBody('');
    setIsSending(true);
    try {
      const message = await sendMessage(matchId, nextBody);
      if (messages.length === 0) void track('first_message_sent');
      setMessages((items) =>
        items.some((item) => item.id === message.id) ? items : [...items, message],
      );
    } catch (sendError) {
      setBody(nextBody);
      setError(sendError instanceof Error ? sendError.message : t('chat.sendError'));
    } finally {
      setIsSending(false);
    }
  };

  const onWePlayed = async () => {
    if (!matchId || session?.playedAt || session?.iConfirmed) return;
    setIsConfirming(true);
    try {
      const next = await confirmPlayed(matchId);
      setSession(next);
    } catch {
      setError(t('chat.wePlayedError'));
    } finally {
      setIsConfirming(false);
    }
  };

  const unmatch = async () => {
    if (!matchId) return;
    const { error: unmatchError } = await supabase.rpc('unmatch', { match_id_input: matchId });
    if (unmatchError) {
      setError(unmatchError.message);
      return;
    }
    router.replace('/matches');
  };

  const showSafetyActions = () => {
    if (!match) return;
    Alert.alert(t('chat.safety'), t('chat.actionFor', { name: match.firstName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat.report'),
        onPress: () => {
          void reportUser(match.otherUserId, 'inappropriate_behaviour')
            .then(() =>
              Alert.alert(t('chat.reportReceived'), t('chat.reportReceivedBody')),
            )
            .catch((reportError: Error) => setError(reportError.message));
        },
      },
      {
        text: t('chat.unmatch'),
        onPress: () => void unmatch(),
      },
      {
        text: t('chat.block'),
        style: 'destructive',
        onPress: () => {
          void blockUser(match.otherUserId)
            .then(() => router.replace('/matches'))
            .catch((blockError: Error) => setError(blockError.message));
        },
      },
    ]);
  };

  const wePlayedLabel = session?.playedAt
    ? t('chat.wePlayedBoth')
    : session?.iConfirmed
      ? t('chat.wePlayedDone')
      : t('chat.wePlayed');

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
      className="flex-1 bg-canvas"
    >
      <View className="flex-row items-center justify-between border-b border-border bg-ink px-4 py-3">
        <Text className="font-display text-[28px] leading-none tracking-[0.02em] text-canvas">
          {match?.firstName ?? ''}
        </Text>
        <Pressable accessibilityRole="button" onPress={showSafetyActions}>
          <Text className="font-mono text-[11px] uppercase tracking-[0.12em] text-danger">
            {t('chat.safety')}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={wePlayedLabel}
        disabled={Boolean(session?.playedAt || session?.iConfirmed) || isConfirming}
        onPress={() => void onWePlayed()}
        className={cn(
          'min-h-11 items-center justify-center border-b border-border px-4',
          session?.playedAt ? 'bg-lime' : 'bg-surface',
          (session?.iConfirmed || isConfirming) && !session?.playedAt && 'opacity-70',
        )}
      >
        <Text className="font-sans-bold text-[15px] text-ink">{wePlayedLabel}</Text>
      </Pressable>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerClassName="grow justify-end p-4"
        renderItem={({ item }) => {
          const own = item.senderId === userId;
          return (
            <View
              className={cn(
                'my-1 max-w-[82%] rounded-sm px-4 py-2',
                own ? 'self-end bg-ink' : 'self-start border border-border bg-surface',
              )}
            >
              <Text
                selectable
                className={cn('font-sans text-[16px]', own ? 'text-canvas' : 'text-ink')}
              >
                {item.body}
              </Text>
            </View>
          );
        }}
      />
      {error ? (
        <Text
          selectable
          accessibilityRole="alert"
          className="px-3 py-2 font-sans text-danger"
        >
          {error}
        </Text>
      ) : null}
      <View className="flex-row items-end gap-2 border-t border-border bg-surface p-4">
        <TextInput
          accessibilityLabel="Message"
          value={body}
          onChangeText={(value) => setBody(value.slice(0, 1000))}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.muted}
          multiline
          className="max-h-[120px] min-h-11 flex-1 rounded-sm bg-canvas px-4 font-sans text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          disabled={!body.trim() || isSending}
          onPress={send}
          className={cn(
            'min-h-11 min-w-[54px] items-center justify-center rounded-sm bg-lime px-3',
            (!body.trim() || isSending) && 'opacity-45',
          )}
        >
          <Text className="font-sans-bold text-ink">{t('chat.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
