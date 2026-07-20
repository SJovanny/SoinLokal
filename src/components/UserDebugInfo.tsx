import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../utils/constants';

const UserDebugInfo: React.FC = () => {
  if (!__DEV__) return null;

  const { user, userProfile, logout } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Info</Text>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Email :</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Nom :</Text>
        <Text style={styles.value}>{userProfile?.first_name} {userProfile?.last_name}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Rôle :</Text>
        <Text style={styles.value}>
          {userProfile?.user_type === 'nurse' ? '👩‍⚕️ Infirmière' : userProfile?.user_type === 'family' ? '👨‍👩‍👧‍👦 Famille' : '🏥 Patient'}
        </Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>🚪 Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      position: 'absolute', top: 50, left: 10, right: 10,
      backgroundColor: 'rgba(0,0,0,0.85)', padding: 12,
      borderRadius: 10, zIndex: 1000,
    },
    title: { color: 'white', fontSize: 13, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    infoRow: { flexDirection: 'row', marginBottom: 4 },
    label: { color: '#aaa', fontSize: 12, width: 55 },
    value: { color: 'white', fontSize: 12, flex: 1 },
    logoutButton: { backgroundColor: colors.DANGER, padding: 6, borderRadius: 6, marginTop: 8, alignItems: 'center' },
    logoutText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  });
}

export default UserDebugInfo;
