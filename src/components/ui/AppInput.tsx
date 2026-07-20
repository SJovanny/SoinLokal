import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface AppInputProps extends TextInputProps {
  icon?:           IoniconName;
  label?:          string;
  error?:          string;
  rightElement?:   React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppInput({
  icon,
  label,
  error,
  rightElement,
  containerStyle,
  style,
  ...textInputProps
}: AppInputProps): React.JSX.Element {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.DANGER
    : focused
    ? colors.NURSE_PRIMARY
    : colors.BORDER;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, { borderColor }]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? colors.NURSE_PRIMARY : colors.TEXT_MUTED}
            style={styles.iconLeft}
          />
        ) : null}

        <TextInput
          {...textInputProps}
          onFocus={(e) => {
            setFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            textInputProps.onBlur?.(e);
          }}
          style={[styles.input, style]}
          placeholderTextColor={colors.TEXT_MUTED}
        />

        {rightElement ? (
          <View style={styles.rightElement}>{rightElement}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: SIZES.MD,
    },
    label: {
      fontSize:     SIZES.FONT_SM,
      color:        colors.TEXT_SECONDARY,
      marginBottom: SIZES.XS,
      fontWeight:   '500',
    },
    inputRow: {
      flexDirection:   'row',
      alignItems:      'center',
      backgroundColor: colors.WHITE,
      borderWidth:     1.5,
      borderRadius:    SIZES.BORDER_RADIUS_MD,
      height:          SIZES.INPUT_HEIGHT,
      paddingHorizontal: SIZES.MD,
    },
    iconLeft: {
      marginRight: SIZES.SM,
    },
    input: {
      flex:      1,
      fontSize:  SIZES.FONT_MD,
      color:     colors.TEXT_PRIMARY,
      height:    '100%',
    },
    rightElement: {
      marginLeft: SIZES.SM,
    },
    errorText: {
      marginTop: SIZES.XS,
      fontSize:  SIZES.FONT_XS,
      color:     colors.DANGER,
    },
  });
}
