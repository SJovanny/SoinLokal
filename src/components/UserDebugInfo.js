import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/**
 * Composant de débogage pour afficher les informations de l'utilisateur connecté
 * À utiliser uniquement en développement
 */
const UserDebugInfo = () => {
  const { user, userProfile, logout } = useAuth();

  if (!user) return null;

  const isTestUser = user.isTestUser;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Info</Text>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Type :</Text>
        <Text style={[styles.value, isTestUser && styles.testUser]}>
          {isTestUser ? '🧪 Test User' : '🔥 Firebase User'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Nom :</Text>
        <Text style={styles.value}>
          {userProfile?.firstName} {userProfile?.lastName}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Email :</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Rôle :</Text>
        <Text style={styles.value}>
          {userProfile?.userType === 'nurse' ? '👩‍⚕️ Infirmière' : '🏥 Patient'}
          {userProfile?.isFamily && ' (Famille)'}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>🚪 Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    width: 60,
  },
  value: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  testUser: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default UserDebugInfo;
