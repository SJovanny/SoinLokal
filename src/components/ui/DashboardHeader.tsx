import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardHeaderProps {
  greeting:        string;
  userName:        string;
  themeColor:      string;
  badge?:          string;
  onProfilePress?: () => void;
  rightAction?:    React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardHeader({
  greeting,
  userName,
  themeColor,
  badge,
  onProfilePress,
  rightAction,
}: DashboardHeaderProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Left — greeting + name */}
      <View style={styles.leftBlock}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.userName}>{userName}</Text>

        {badge ? (
          <View style={[styles.badge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
            <Text style={[styles.badgeText, { color: themeColor }]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {/* Right — profile icon + optional rightAction */}
      <View style={styles.rightBlock}>
        {rightAction ?? null}

        <TouchableOpacity
          onPress={onProfilePress}
          activeOpacity={0.75}
          style={styles.profileBtn}
        >
          <Ionicons
            name="person-circle-outline"
            size={36}
            color={themeColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      backgroundColor:   colors.WHITE,
      paddingHorizontal: SIZES.LG,
      paddingVertical:   SIZES.LG,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    leftBlock: {
      flex: 1,
    },
    greeting: {
      fontSize:  15,
      color:     colors.TEXT_SECONDARY,
      fontWeight: '400',
    },
    userName: {
      fontSize:   20,
      fontWeight: '700',
      color:      colors.TEXT_PRIMARY,
      marginTop:  2,
    },
    badge: {
      alignSelf:         'flex-start',
      marginTop:         SIZES.XS,
      borderRadius:      SIZES.BORDER_RADIUS_FULL,
      borderWidth:       1,
      paddingHorizontal: SIZES.SM,
      paddingVertical:   2,
    },
    badgeText: {
      fontSize:   SIZES.FONT_XS,
      fontWeight: '600',
    },
    rightBlock: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           SIZES.SM,
    },
    profileBtn: {
      padding: 2,
    },
  });
}
