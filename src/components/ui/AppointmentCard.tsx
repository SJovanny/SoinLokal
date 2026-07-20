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

export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface AppointmentCardProps {
  patientOrNurseName: string;
  careType:           string;
  time:               string;
  date?:              string;
  address?:           string;
  status:             AppointmentStatus;
  themeColor?:        string;
  onPress?:           () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppointmentCard({
  patientOrNurseName,
  careType,
  time,
  date,
  address,
  status,
  themeColor,
  onPress,
}: AppointmentCardProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusConfig: Record<AppointmentStatus, { color: string; label: string }> = {
    confirmed:  { color: colors.NURSE_PRIMARY, label: 'Confirmé' },
    pending:    { color: colors.WARNING,       label: 'En attente' },
    completed:  { color: colors.TEXT_MUTED,    label: 'Terminé' },
    cancelled:  { color: colors.DANGER,        label: 'Annulé' },
  };

  const resolvedThemeColor = themeColor ?? colors.NURSE_PRIMARY;
  const { color: statusColor, label: statusLabel } = statusConfig[status];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.card, { borderLeftColor: statusColor }]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {patientOrNurseName}
          </Text>
          <Text style={styles.careType}>{careType}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Time */}
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={15} color={resolvedThemeColor} />
        <Text style={[styles.time, { color: resolvedThemeColor }]}>{time}</Text>
        {date ? (
          <>
            <Text style={styles.dateSeparator}> · </Text>
            <Text style={styles.date}>{date}</Text>
          </>
        ) : null}
      </View>

      {/* Address */}
      {address ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.TEXT_MUTED} />
          <Text style={styles.address} numberOfLines={1}>
            {address}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.WHITE,
      borderRadius:    SIZES.BORDER_RADIUS_MD,
      padding:         SIZES.MD,
      marginBottom:    SIZES.SM,
      borderLeftWidth: 4,
      // Shadow — iOS
      shadowColor:   colors.BLACK,
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius:  6,
      // Shadow — Android
      elevation: 3,
    },
    headerRow: {
      flexDirection:  'row',
      justifyContent: 'space-between',
      alignItems:     'flex-start',
      marginBottom:   SIZES.SM,
    },
    nameBlock: {
      flex: 1,
      marginRight: SIZES.SM,
    },
    name: {
      fontSize:   SIZES.FONT_MD,
      fontWeight: '600',
      color:      colors.TEXT_PRIMARY,
    },
    careType: {
      fontSize:  SIZES.FONT_SM,
      color:     colors.TEXT_SECONDARY,
      marginTop: 2,
    },
    badge: {
      borderRadius:    SIZES.BORDER_RADIUS_FULL,
      borderWidth:     1,
      paddingHorizontal: SIZES.SM,
      paddingVertical:   2,
    },
    badgeText: {
      fontSize:   SIZES.FONT_XS,
      fontWeight: '600',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems:    'center',
      marginBottom:  4,
    },
    time: {
      fontSize:   SIZES.FONT_SM,
      fontWeight: '600',
      marginLeft: 4,
    },
    dateSeparator: {
      color:    colors.TEXT_MUTED,
      fontSize: SIZES.FONT_SM,
    },
    date: {
      fontSize: SIZES.FONT_SM,
      color:    colors.TEXT_SECONDARY,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems:    'center',
      marginTop:     2,
    },
    address: {
      flex:      1,
      fontSize:  SIZES.FONT_SM,
      color:     colors.TEXT_MUTED,
      marginLeft: 4,
    },
  });
}
