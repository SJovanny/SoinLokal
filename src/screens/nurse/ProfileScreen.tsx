import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../../components/LogoutButton';

const ProfileScreen = () => {
  const { userProfile, nurseProfile, patientProfile } = useAuth();

  const getRoleLabel = () => {
    switch (userProfile?.user_type) {
      case 'nurse': return '👩‍⚕️ Infirmière libérale';
      case 'family': return '👨‍👩‍👧‍👦 Famille';
      default: return '🏥 Patient';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Text style={styles.headerSubtitle}>Informations personnelles</Text>
        </View>

        {/* Photo de profil et informations principales */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={60} color="#2E8B57" />
            </View>
          </View>
          
          <Text style={styles.userName}>
            {userProfile?.first_name} {userProfile?.last_name}
          </Text>
          <Text style={styles.userRole}>{getRoleLabel()}</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Informations professionnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations professionnelles</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="id-card-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>N° ADELI</Text>
              <Text style={styles.infoValue}>{nurseProfile?.adeli || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{userProfile?.phone || 'Non renseigné'}</Text>
            </View>
          </View>

          {nurseProfile?.specialties && (
            <View style={styles.infoRow}>
              <Ionicons name="medical-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Spécialités</Text>
                <Text style={styles.infoValue}>
                  {nurseProfile.specialties.join(', ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Adresse */}
        {patientProfile?.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>{patientProfile.address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Statistiques */}
        {userProfile?.user_type === 'nurse' && nurseProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.total_patients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.total_visits}</Text>
                <Text style={styles.statLabel}>Visites</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bouton de déconnexion */}
        <View style={styles.logoutSection}>
          <LogoutButton 
            variant="danger" 
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: '#2E8B57',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  logoutSection: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  logoutButton: {
    minWidth: 200,
  },
});

export default ProfileScreen;
