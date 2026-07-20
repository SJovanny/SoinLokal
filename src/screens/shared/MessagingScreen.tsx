import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useMessageCount } from '../../contexts/MessageCountContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../utils/supabase';
import { resolveAccessibleFileIds } from '../../utils/messagingAccess';
import { getColors, SIZES, getThemeColor } from '../../utils/constants';
import Avatar from '../../components/Avatar';

interface Conversation {
  patientFileId: string;
  patientId: string;
  participantId: string;
  isManaged: boolean;
  hasGuardian: boolean;
  participantName: string;
  participantSubtitle: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isFromMe: boolean;
}

const MessagingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, userProfile, familyLinks } = useAuth();
  const { refreshUnreadCount } = useMessageCount();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileIdsRef = useRef<string[]>([]);

  const themeColor = getThemeColor(userProfile?.user_type ?? 'patient');

  const fetchConversations = useCallback(async () => {
    if (!user || !userProfile) return;

    try {
      const { fileIds, fileInfoMap } = await resolveAccessibleFileIds(user, userProfile, familyLinks);

      if (fileIds.length === 0) {
        fileIdsRef.current = [];
        setConversations([]);
        return;
      }

      fileIdsRef.current = fileIds;

      const { data: messages } = await supabase
        .from('messages')
        .select('id, patient_file_id, content, created_at, is_read, author_id')
        .in('patient_file_id', fileIds)
        .order('created_at', { ascending: false })
        .limit(500);

      const latestPerFile: Record<string, { content: string; created_at: string; isFromMe: boolean }> = {};
      const unreadPerFile: Record<string, number> = {};
      fileIds.forEach((id) => { unreadPerFile[id] = 0; });

      (messages ?? []).forEach((m: any) => {
        const info = fileInfoMap[m.patient_file_id];
        const proxyPatientId = info?.isManaged ? info.patientId : null;
        const isMyMessage = m.author_id === user.id || m.author_id === proxyPatientId;

        if (!latestPerFile[m.patient_file_id]) {
          latestPerFile[m.patient_file_id] = {
            content: m.content,
            created_at: m.created_at,
            isFromMe: isMyMessage,
          };
        }
        if (!m.is_read && !isMyMessage) {
          unreadPerFile[m.patient_file_id] = (unreadPerFile[m.patient_file_id] ?? 0) + 1;
        }
      });

      const convs: Conversation[] = fileIds.map((fid) => ({
        patientFileId: fid,
        participantName: fileInfoMap[fid]?.participantName ?? 'Inconnu',
        participantSubtitle: fileInfoMap[fid]?.participantSubtitle ?? '',
        patientId: fileInfoMap[fid]?.patientId ?? '',
        participantId: fileInfoMap[fid]?.participantId ?? '',
        isManaged: fileInfoMap[fid]?.isManaged ?? false,
        hasGuardian: fileInfoMap[fid]?.hasGuardian ?? false,
        lastMessage: latestPerFile[fid]?.content ?? 'Aucun message',
        lastMessageTime: latestPerFile[fid]?.created_at ?? '',
        unreadCount: unreadPerFile[fid] ?? 0,
        isFromMe: latestPerFile[fid]?.isFromMe ?? false,
      }));

      convs.sort((a, b) => {
        const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(convs);
      setError(null);
      refreshUnreadCount();
    } catch (err) {
      console.error('[MessagingScreen] error:', err);
      setError('Impossible de charger les conversations');
    }
  }, [user, userProfile, familyLinks, refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchConversations().finally(() => setLoading(false));
    }, [fetchConversations])
  );

  // Keep the latest fetchConversations in a ref so the realtime subscription
  // below only reconnects when the user actually changes (login/logout),
  // not on every AuthContext refresh (which hands out new object/array
  // references for `userProfile`/`familyLinks` even when unchanged).
  const fetchConversationsRef = useRef(fetchConversations);
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('messages:list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { patient_file_id: string };
          if (fileIdsRef.current.includes(msg.patient_file_id)) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              fetchConversationsRef.current();
            }, 300);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[MessagingScreen] realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[MessagingScreen] realtime channel error');
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const formatMessageTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('ChatScreen', {
          patientFileId: item.patientFileId,
          participantName: item.participantName,
          participantSubtitle: item.participantSubtitle,
          participantId: item.participantId,
          hasGuardian: item.hasGuardian,
          ...(item.isManaged ? { managedPatientId: item.patientId } : {}),
        })
      }
    >
      <View style={styles.avatarContainer}>
        <Avatar
          photoUrl={(item as any).participantPhotoUrl}
          avatarType={(item as any).participantAvatarType}
          avatarSeed={(item as any).participantAvatarSeed}
          firstName={item.participantName.split(' ')[0]}
          lastName={item.participantName.split(' ').slice(1).join(' ')}
          size={52}
          backgroundColor={themeColor}
          textColor={colors.WHITE}
        />
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.DANGER }]}>
            <Text style={styles.unreadText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[styles.participantName, item.unreadCount > 0 && styles.participantNameBold]}
            numberOfLines={1}
          >
            {item.participantName}
          </Text>
          <Text style={styles.messageTime}>{formatMessageTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.participantSubtitle} numberOfLines={1}>
          {item.participantSubtitle}
        </Text>
        <Text
          style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {item.isFromMe ? 'Moi : ' : ''}
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.TEXT_MUTED} />
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: themeColor }]} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={18} color={themeColor} />
            <Text style={[styles.retryText, { color: themeColor }]}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.BORDER} />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySubtitle}>Vos messages apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.patientFileId}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColor]} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    centerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SIZES.XXL,
      gap: SIZES.MD,
    },
    header: {
      padding: SIZES.LG,
      backgroundColor: colors.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    headerTitle: {
      fontSize: SIZES.FONT_XL,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    conversationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SIZES.MD,
      backgroundColor: colors.WHITE,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: SIZES.MD,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.WHITE,
    },
    unreadBadge: {
      position: 'absolute',
      top: -2,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    unreadText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.WHITE,
    },
    conversationContent: {
      flex: 1,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    participantName: {
      fontSize: SIZES.FONT_MD,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
      flex: 1,
      marginRight: SIZES.SM,
    },
    participantNameBold: {
      fontWeight: '800',
    },
    messageTime: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
    },
    participantSubtitle: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_SECONDARY,
      marginBottom: 2,
    },
    lastMessage: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_MUTED,
    },
    lastMessageUnread: {
      color: colors.TEXT_PRIMARY,
      fontWeight: '600',
    },
    separator: {
      height: 1,
      backgroundColor: colors.BORDER,
      marginLeft: 84,
    },
    emptyTitle: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
    },
    emptySubtitle: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_MUTED,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.SM,
      paddingHorizontal: SIZES.LG,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1,
      marginTop: SIZES.SM,
    },
    retryText: {
      fontSize: SIZES.FONT_MD,
      fontWeight: '600',
    },
  });
}

export default MessagingScreen;
