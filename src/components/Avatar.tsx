import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, type ImageStyle } from 'react-native';
import { getDicebearUrl, nameToSeed, type AvatarType } from '../utils/avatar';
import { getColors, SIZES } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AvatarProps {
  /** URL of an uploaded photo (photo_url from profile) */
  photoUrl?: string;
  /** Whether the avatar is a real photo or a generated DiceBear */
  avatarType: AvatarType;
  /** DiceBear seed — used to render the generated avatar */
  avatarSeed?: string;
  /** User's first name (used for initials fallback & seed generation) */
  firstName?: string;
  /** User's last name (used for initials fallback) */
  lastName?: string;
  /** Diameter in pixels (default 80) */
  size?: number;
  /** Optional extra style for the outermost container */
  style?: ImageStyle;
  /** Background color when showing initials (default: NURSE_LIGHT) */
  backgroundColor?: string;
  /** Text color when showing initials (default: NURSE_PRIMARY) */
  textColor?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Avatar: React.FC<AvatarProps> = ({
  photoUrl,
  avatarType,
  avatarSeed,
  firstName = '',
  lastName = '',
  size = 80,
  style,
  backgroundColor,
  textColor,
}) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedBackgroundColor = backgroundColor ?? colors.NURSE_LIGHT;
  const resolvedTextColor = textColor ?? colors.NURSE_PRIMARY;

  const borderRadius = size / 2;
  const fontSize = size * 0.36;

  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';

  // Determine image source
  let imageSource: { uri: string } | null = null;

  if (avatarType === 'photo' && photoUrl) {
    imageSource = { uri: photoUrl };
  } else if (avatarType === 'generated') {
    const seed = avatarSeed || nameToSeed(firstName, lastName);
    imageSource = { uri: getDicebearUrl(seed, size * 2) };
  }

  if (imageSource) {
    return (
      <Image
        key={photoUrl || 'generated'}
        source={imageSource}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
          },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  // Fallback: initials
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: resolvedBackgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: resolvedTextColor }]}>
        {initials}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      fontWeight: '700',
    },
  });
}

export default Avatar;
