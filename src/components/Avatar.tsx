import React from 'react';
import { View, Text, Image, StyleSheet, type ImageStyle } from 'react-native';
import { getDicebearUrl, nameToSeed, type AvatarType } from '../utils/avatar';
import { COLORS, SIZES } from '../utils/constants';

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
  backgroundColor = COLORS.NURSE_LIGHT,
  textColor = COLORS.NURSE_PRIMARY,
}) => {
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
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: textColor }]}>
        {initials}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});

export default Avatar;
