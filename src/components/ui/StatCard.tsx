import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface StatCardProps {
  value:    string | number;
  label:    string;
  icon?:    IoniconName;
  color?:   string;
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatCard({
  value,
  label,
  icon,
  color,
  onPress,
}: StatCardProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedColor = color ?? colors.NURSE_PRIMARY;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { onPress, activeOpacity: 0.8 }
    : {};

  return (
    <Container
      {...(containerProps as object)}
      style={styles.card as StyleProp<ViewStyle>}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: resolvedColor + '1A' }]}>
          <Ionicons name={icon} size={22} color={resolvedColor} />
        </View>
      ) : null}

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Container>
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
      flex:            1,
      minWidth:        '45%',
      margin:          SIZES.XS,
      // Shadow — iOS
      shadowColor:  colors.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius:  6,
      // Shadow — Android
      elevation: 3,
    },
    iconWrap: {
      width:         40,
      height:        40,
      borderRadius:  20,
      alignItems:    'center',
      justifyContent:'center',
      marginBottom:  SIZES.SM,
    },
    value: {
      fontSize:   SIZES.FONT_XL,
      fontWeight: '700',
      color:      colors.TEXT_PRIMARY,
      marginBottom: 2,
    },
    label: {
      fontSize: SIZES.FONT_SM,
      color:    colors.TEXT_MUTED,
      fontWeight: '400',
    },
  });
}
