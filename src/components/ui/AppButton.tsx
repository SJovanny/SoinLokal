import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SIZES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface AppButtonProps {
  label:       string;
  onPress:     () => void;
  variant?:    'primary' | 'secondary' | 'danger' | 'ghost';
  themeColor?: string;
  loading?:    boolean;
  disabled?:   boolean;
  icon?:       IoniconName;
  fullWidth?:  boolean;
  size?:       'sm' | 'md' | 'lg';
}

// ---------------------------------------------------------------------------
// Height map
// ---------------------------------------------------------------------------

const HEIGHT_MAP: Record<NonNullable<AppButtonProps['size']>, number> = {
  sm: 40,
  md: 52,
  lg: 48,
};

const FONT_MAP: Record<NonNullable<AppButtonProps['size']>, number> = {
  sm: SIZES.FONT_SM,
  md: SIZES.FONT_MD,
  lg: SIZES.FONT_LG,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppButton({
  label,
  onPress,
  variant    = 'primary',
  themeColor = COLORS.NURSE_PRIMARY,
  loading    = false,
  disabled   = false,
  icon,
  fullWidth  = true,
  size       = 'md',
}: AppButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  const height     = HEIGHT_MAP[size];
  const fontSize   = FONT_MAP[size];

  // ---- Resolve variant styles ----
  const resolvedBackground = (): string => {
    if (isDisabled) return COLORS.BORDER;
    switch (variant) {
      case 'primary':   return themeColor;
      case 'secondary': return COLORS.WHITE;
      case 'danger':    return COLORS.DANGER;
      case 'ghost':     return 'transparent';
    }
  };

  const resolvedTextColor = (): string => {
    if (isDisabled) return COLORS.TEXT_MUTED;
    switch (variant) {
      case 'primary':   return COLORS.WHITE;
      case 'secondary': return themeColor;
      case 'danger':    return COLORS.WHITE;
      case 'ghost':     return themeColor;
    }
  };

  const resolvedBorderColor = (): string | undefined => {
    if (variant === 'secondary') return themeColor;
    return undefined;
  };

  const backgroundColor = resolvedBackground();
  const textColor       = resolvedTextColor();
  const borderColor     = resolvedBorderColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height,
          backgroundColor,
          borderColor:  borderColor ?? 'transparent',
          borderWidth:  borderColor ? 1.5 : 0,
          alignSelf:    fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? 0 : SIZES.LG,
          opacity: isDisabled ? 0.6 : 1,
        } as StyleProp<ViewStyle>,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? COLORS.WHITE : themeColor}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={fontSize + 2}
              color={textColor}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   SIZES.BORDER_RADIUS_MD,
  },
  icon: {
    marginRight: SIZES.SM,
  },
  label: {
    fontWeight: '600',
  },
});
