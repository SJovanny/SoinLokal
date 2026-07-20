import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

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
  themeColor,
}: SectionHeaderProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedThemeColor = themeColor ?? colors.NURSE_PRIMARY;

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>

      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}>
          <Text style={[styles.action, { color: resolvedThemeColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    row: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   SIZES.SM,
    },
    title: {
      fontSize:   SIZES.FONT_LG,
      fontWeight: '700',
      color:      colors.TEXT_PRIMARY,
    },
    action: {
      fontSize:   SIZES.FONT_SM,
      fontWeight: '600',
    },
  });
}
