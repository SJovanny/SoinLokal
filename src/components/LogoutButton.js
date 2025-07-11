import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton = ({ 
  style, 
  textStyle, 
  iconSize = 20, 
  showText = true, 
  variant = 'default',
  onLogoutStart,
  onLogoutComplete 
}) => {
  const { logout, user, userProfile } = useAuth();

  const handleLogout = () => {
    const userName = userProfile?.firstName || 'utilisateur';
    
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

  // Styles basés sur la variante
  const getButtonStyle = () => {
    switch (variant) {
      case 'icon':
        return [styles.iconButton, style];
      case 'minimal':
        return [styles.minimalButton, style];
      case 'danger':
        return [styles.dangerButton, style];
      default:
        return [styles.defaultButton, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'danger':
        return [styles.dangerText, textStyle];
      case 'minimal':
        return [styles.minimalText, textStyle];
      default:
        return [styles.defaultText, textStyle];
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
        color={variant === 'danger' ? 'white' : variant === 'minimal' ? '#666' : '#2E8B57'} 
        style={showText ? styles.iconWithText : null}
      />
      {showText && (
        <Text style={getTextStyle()}>
          Déconnexion
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  defaultText: {
    color: '#2E8B57',
    fontSize: 16,
    fontWeight: '600',
  },
  minimalText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  dangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  iconWithText: {
    marginRight: 8,
  },
});

export default LogoutButton;
