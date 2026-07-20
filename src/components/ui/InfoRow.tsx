import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

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
  iconColor,
}: InfoRowProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedIconColor = iconColor ?? colors.TEXT_MUTED;

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={resolvedIconColor} style={styles.icon} />

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

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
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
      color:     colors.TEXT_MUTED,
      fontWeight: '400',
      marginBottom: 2,
    },
    value: {
      fontSize:  SIZES.FONT_MD,
      color:     colors.TEXT_PRIMARY,
      fontWeight: '500',
    },
  });
}
