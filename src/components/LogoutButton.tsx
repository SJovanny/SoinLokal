import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../utils/constants';

type Variant = 'default' | 'icon' | 'minimal' | 'danger';

interface LogoutButtonProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconSize?: number;
  showText?: boolean;
  variant?: Variant;
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  style,
  textStyle,
  iconSize = 20,
  showText = true,
  variant = 'default',
  onLogoutStart,
  onLogoutComplete,
}) => {
  const { logout, userProfile } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLogout = () => {
    const userName = userProfile?.first_name || 'utilisateur';

    Alert.alert(
      'Déconnexion',
      `Êtes-vous sûr de vouloir vous déconnecter, ${userName} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onLogoutStart) onLogoutStart();
              await logout();
              if (onLogoutComplete) onLogoutComplete();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
            }
          },
        },
      ]
    );
  };

  const getButtonStyle = (): ViewStyle[] => {
    switch (variant) {
      case 'icon':
        return [styles.iconButton, style as ViewStyle];
      case 'minimal':
        return [styles.minimalButton, style as ViewStyle];
      case 'danger':
        return [styles.dangerButton, style as ViewStyle];
      default:
        return [styles.defaultButton, style as ViewStyle];
    }
  };

  const getTextStyle = (): TextStyle[] => {
    switch (variant) {
      case 'danger':
        return [styles.dangerText, textStyle as TextStyle];
      case 'minimal':
        return [styles.minimalText, textStyle as TextStyle];
      default:
        return [styles.defaultText, textStyle as TextStyle];
    }
  };

  const getIconColor = (): string => {
    switch (variant) {
      case 'danger':
        return colors.WHITE;
      case 'minimal':
        return colors.TEXT_SECONDARY;
      default:
        return colors.NURSE_PRIMARY;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handleLogout}
      activeOpacity={0.7}
    >
      <Ionicons
        name="log-out-outline"
        size={iconSize}
        color={getIconColor()}
        style={showText ? styles.iconWithText : undefined}
      />
      {showText && (
        <Text style={getTextStyle()}>Déconnexion</Text>
      )}
    </TouchableOpacity>
  );
};

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    defaultButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.BACKGROUND,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.NURSE_PRIMARY,
    },
    iconButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.BACKGROUND,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.BORDER,
    },
    minimalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.DANGER,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    defaultText: {
      color: colors.NURSE_PRIMARY,
      fontSize: 16,
      fontWeight: '600',
    },
    minimalText: {
      color: colors.TEXT_SECONDARY,
      fontSize: 14,
      fontWeight: '500',
    },
    dangerText: {
      color: colors.WHITE,
      fontSize: 16,
      fontWeight: '600',
    },
    iconWithText: {
      marginRight: 8,
    },
  });
}

export default LogoutButton;
