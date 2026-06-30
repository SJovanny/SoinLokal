import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS, SIZES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionHeaderProps {
  title:          string;
  actionLabel?:   string;
  onActionPress?: () => void;
  themeColor?:    string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  themeColor = COLORS.NURSE_PRIMARY,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>

      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}>
          <Text style={[styles.action, { color: themeColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SIZES.SM,
  },
  title: {
    fontSize:   SIZES.FONT_LG,
    fontWeight: '700',
    color:      COLORS.TEXT_PRIMARY,
  },
  action: {
    fontSize:   SIZES.FONT_SM,
    fontWeight: '600',
  },
});
