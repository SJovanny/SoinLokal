import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SIZES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface InfoRowProps {
  icon:        IoniconName;
  label:       string;
  value:       string;
  iconColor?:  string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InfoRow({
  icon,
  label,
  value,
  iconColor = COLORS.TEXT_MUTED,
}: InfoRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />

      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: SIZES.SM,
  },
  icon: {
    marginRight: SIZES.MD,
    width:       24,
    textAlign:   'center',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize:  SIZES.FONT_XS,
    color:     COLORS.TEXT_MUTED,
    fontWeight: '400',
    marginBottom: 2,
  },
  value: {
    fontSize:  SIZES.FONT_MD,
    color:     COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
});
