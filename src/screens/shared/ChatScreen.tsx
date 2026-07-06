import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Message } from '../../utils/supabase';
import { COLORS, SIZES, getThemeColor } from '../../utils/constants';

interface MessageGroup {
  type: 'message' | 'date';
  id: string;
  message?: Message & { authorName?: string };
  date?: string;
  isMine?: boolean;
}

const ChatScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const patientFileId: string = route.params.patientFileId;
  const participantName: string = route.params.participantName;
  const participantSubtitle: string = route.params.participantSubtitle ?? '';
  const managedPatientId: string | undefined = route.params.managedPatientId;
  const hasGuardian: boolean = route.params.hasGuardian ?? false;
  const { user, userProfile } = useAuth();
  const themeColor = getThemeColor(userProfile?.user_type ?? 'patient');
  const effectiveAuthorId = managedPatientId || user?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_file_id', patientFileId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data as Message[]);
      }
    };

    const markAsRead = async () => {
      let query = supabase
        .from('messages')
        .update({ is_read: true })
        .eq('patient_file_id', patientFileId)
        .neq('author_id', user.id)
        .eq('is_read', false);

      if (managedPatientId) {
        query = query.neq('author_id', managedPatientId);
      }

      await query;
    };

    fetchMessages().then(() => setLoading(false));
    markAsRead();

    const channel = supabase
      .channel(`messages:${patientFileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_file_id=eq.${patientFileId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.author_id !== user.id && newMsg.author_id !== managedPatientId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientFileId, user]);

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !user || sending) return;

    setSending(true);
    setInputText('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        author_id: effectiveAuthorId,
        patient_file_id: patientFileId,
        content: trimmed,
        is_read: false,
      })
      .select()
      .single();

    if (data && !error) {
      setMessages((prev) => [...prev, data as Message]);
    } else {
      console.error('[ChatScreen] send error:', error?.message);
      setInputText((prev) => (prev === '' ? trimmed : prev));
    }

    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const buildGroups = useCallback((): MessageGroup[] => {
    const groups: MessageGroup[] = [];
    let lastDate = '';

    messages.forEach((msg) => {
      const msgDate = msg.created_at.substring(0, 10);
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        groups.push({
          type: 'date',
          id: `date-${msgDate}`,
          date: msgDate,
        });
      }
      groups.push({
        type: 'message',
        id: msg.id,
        message: msg,
        isMine: msg.author_id === effectiveAuthorId,
      });
    });

    return groups;
  }, [messages, user]);

  const renderItem = ({ item }: { item: MessageGroup }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDateHeader(item.date!)}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const msg = item.message!;
    const isMine = item.isMine;

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
        <View
          style={[
            styles.messageBubble,
            isMine ? [styles.myBubble, { backgroundColor: themeColor }] : styles.otherBubble,
          ]}
        >
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>{msg.content}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
              {formatTime(msg.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {participantName}
            </Text>
            {(hasGuardian || managedPatientId) && !!participantSubtitle && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {participantSubtitle}
              </Text>
            )}
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      </SafeAreaView>
    );
  }

  const groups = buildGroups();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {participantName}
          </Text>
          {(hasGuardian || managedPatientId) && !!participantSubtitle && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {participantSubtitle}
            </Text>
          )}
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={groups}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => {
            if (groups.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
        />

        <View style={[styles.inputBar, { borderTopColor: COLORS.BORDER }]}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrivez un message..."
            placeholderTextColor={COLORS.TEXT_MUTED}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? themeColor : COLORS.BORDER },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sending ? 'hourglass-outline' : 'send'}
              size={20}
              color={COLORS.WHITE}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.SM,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SIZES.SM,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.MD,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER,
  },
  dateText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginHorizontal: SIZES.MD,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SIZES.XS,
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_MD,
  },
  myBubble: {
    borderBottomRightRadius: SIZES.XS,
  },
  otherBubble: {
    backgroundColor: COLORS.WHITE,
    borderBottomLeftRadius: SIZES.XS,
  },
  messageText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.WHITE,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.SM,
  },
});

export default ChatScreen;
