import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SIZES } from '../../utils/constants';

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
  color   = COLORS.NURSE_PRIMARY,
  onPress,
}: StatCardProps): React.JSX.Element {
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
        <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name={icon} size={22} color={color} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius:    SIZES.BORDER_RADIUS_MD,
    padding:         SIZES.MD,
    flex:            1,
    minWidth:        '45%',
    margin:          SIZES.XS,
    // Shadow — iOS
    shadowColor:  COLORS.BLACK,
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
    color:      COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  label: {
    fontSize: SIZES.FONT_SM,
    color:    COLORS.TEXT_MUTED,
    fontWeight: '400',
  },
});
