// Provides realtime match chat and immediate unmatch, block, and report controls.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fetchMatches,
  fetchMessages,
  sendMessage,
  type ChatMessage,
  type MatchSummary,
} from '@/features/chat/chat-service';
import { blockUser, reportUser } from '@/features/matching/matching-service';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!matchId) return;

    void Promise.all([fetchMessages(matchId), fetchMatches(), supabase.auth.getUser()]).then(
      ([initialMessages, matches, user]) => {
        setMessages((currentMessages) => {
          const merged = new Map(
            [...initialMessages, ...currentMessages].map((message) => [message.id, message]),
          );
          return [...merged.values()].toSorted((left, right) =>
            left.createdAt.localeCompare(right.createdAt),
          );
        });
        setMatch(matches.find((item) => item.id === matchId) ?? null);
        setUserId(user.data.user?.id ?? '');
      },
    ).catch((loadError: unknown) => {
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

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{match?.firstName ?? ''}</Text>
        <Pressable accessibilityRole="button" onPress={showSafetyActions}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('chat.safety')}</Text>
        </Pressable>
      </View>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: spacing.md }}
        renderItem={({ item }) => {
          const own = item.senderId === userId;
          return (
            <View
              style={{
                maxWidth: '82%',
                alignSelf: own ? 'flex-end' : 'flex-start',
                marginVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: own ? colors.court : colors.surface,
              }}
            >
              <Text selectable style={{ color: own ? colors.surface : colors.ink, fontSize: 16 }}>
                {item.body}
              </Text>
            </View>
          );
        }}
      />
      {error ? (
        <Text selectable accessibilityRole="alert" style={{ color: colors.danger, padding: spacing.sm }}>
          {error}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          padding: spacing.md,
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          accessibilityLabel="Message"
          value={body}
          onChangeText={(value) => setBody(value.slice(0, 1000))}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.muted}
          multiline
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            borderRadius: radius.md,
            backgroundColor: colors.canvas,
            color: colors.ink,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          disabled={!body.trim() || isSending}
          onPress={send}
          style={{
            minWidth: 54,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: colors.court,
            opacity: !body.trim() || isSending ? 0.45 : 1,
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '700' }}>{t('chat.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
