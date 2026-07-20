import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  themeColor,
  loading    = false,
  disabled   = false,
  icon,
  fullWidth  = true,
  size       = 'md',
}: AppButtonProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedThemeColor = themeColor ?? colors.NURSE_PRIMARY;
  const isDisabled = disabled || loading;
  const height     = HEIGHT_MAP[size];
  const fontSize   = FONT_MAP[size];

  // ---- Resolve variant styles ----
  const resolvedBackground = (): string => {
    if (isDisabled) return colors.BORDER;
    switch (variant) {
      case 'primary':   return resolvedThemeColor;
      case 'secondary': return colors.WHITE;
      case 'danger':    return colors.DANGER;
      case 'ghost':     return 'transparent';
    }
  };

  const resolvedTextColor = (): string => {
    if (isDisabled) return colors.TEXT_MUTED;
    switch (variant) {
      case 'primary':   return colors.WHITE;
      case 'secondary': return resolvedThemeColor;
      case 'danger':    return colors.WHITE;
      case 'ghost':     return resolvedThemeColor;
    }
  };

  const resolvedBorderColor = (): string | undefined => {
    if (variant === 'secondary') return resolvedThemeColor;
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
          color={variant === 'primary' || variant === 'danger' ? colors.WHITE : resolvedThemeColor}
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

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
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
}
