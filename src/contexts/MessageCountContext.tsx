import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { resolveAccessibleFileIds, countUnreadMessages } from '../utils/messagingAccess';

interface MessageCountContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
}

const MessageCountContext = createContext<MessageCountContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshUnreadCount: async () => {},
});

export function useMessageCount(): MessageCountContextType {
  return useContext(MessageCountContext);
}

export const MessageCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, familyLinks } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Track which patient_file_ids are currently accessible, for client-side
  // filtering of the centralized realtime channel below.
  const fileIdsRef = useRef<string[]>([]);

  // Keep the latest auth values in a ref so `refreshUnreadCount` and the
  // realtime callback never close over stale data, without forcing the
  // realtime subscription (see below) to reconnect every time AuthContext
  // hands out new object/array references (which happens more than once
  // right after login).
  const authRef = useRef({ user, userProfile, familyLinks });
  useEffect(() => {
    authRef.current = { user, userProfile, familyLinks };
  }, [user, userProfile, familyLinks]);

  // Single source of truth for "how many unread messages does the current
  // user have", independent of which screen/tab happens to be mounted.
  const refreshUnreadCount = useCallback(async () => {
    const { user: currentUser, userProfile: currentProfile, familyLinks: currentLinks } = authRef.current;

    if (!currentUser || !currentProfile) {
      fileIdsRef.current = [];
      setUnreadCount(0);
      return;
    }

    try {
      const { fileIds, fileInfoMap } = await resolveAccessibleFileIds(currentUser, currentProfile, currentLinks);
      fileIdsRef.current = fileIds;
      const count = await countUnreadMessages(currentUser.id, fileIds, fileInfoMap);
      setUnreadCount(count);
    } catch (err) {
      console.error('[MessageCountContext] refresh error:', err);
    }
  }, []);

  // Compute eagerly as soon as the user is authenticated — this no longer
  // depends on the Messages tab ever being visited/mounted.
  useEffect(() => {
    if (!user || !userProfile) {
      fileIdsRef.current = [];
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
  }, [user?.id, userProfile?.user_type, familyLinks, refreshUnreadCount]);

  // One centralized realtime channel for the whole app session (replaces
  // the separate channels previously duplicated in MessagingScreen and each
  // dashboard). Depends only on user?.id so it doesn't reconnect on every
  // profile refresh.
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('messages:unread-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { patient_file_id?: string };
          if (msg?.patient_file_id && fileIdsRef.current.includes(msg.patient_file_id)) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              refreshUnreadCount();
            }, 300);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[MessageCountContext] realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[MessageCountContext] realtime channel error');
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshUnreadCount]);

  return (
    <MessageCountContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </MessageCountContext.Provider>
  );
};
