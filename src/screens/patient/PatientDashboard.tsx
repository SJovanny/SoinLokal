import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../../components/LogoutButton';

interface Appointment {
  id: string;
  nurseName: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending';
}

const PatientDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [upcomingAppointments] = useState<Appointment[]>([
    {
      id: '1',
      nurseName: 'Mme Dupont',
      date: '2025-01-08',
      time: '09:00',
      type: 'Pansement',
      status: 'confirmed'
    },
    {
      id: '2',
      nurseName: 'Mme Dupont',
      date: '2025-01-10',
      time: '10:30',
      type: 'Contrôle glycémie',
      status: 'pending'
    },
  ]);

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentInfo}>
          <Text style={styles.nurseName}>{item.nurseName}</Text>
          <Text style={styles.appointmentType}>{item.type}</Text>
        </View>
        <View style={styles.appointmentTime}>
          <Text style={styles.time}>{item.time}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
        </View>
      </View>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'confirmed' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? 'Confirmé' : 'En attente'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={32} color="#4A90E2" />
            </TouchableOpacity>
            <LogoutButton 
              variant="icon" 
              showText={false}
              style={styles.logoutButtonHeader}
            />
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="heart" size={24} color="#4A90E2" />
            <Text style={styles.statusTitle}>Statut de vos soins</Text>
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{upcomingAppointments.length}</Text>
              <Text style={styles.statusLabel}>Prochains RDV</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>3</Text>
              <Text style={styles.statusLabel}>Soins récents</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>0</Text>
              <Text style={styles.statusLabel}>Messages</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prochains rendez-vous</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={upcomingAppointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    padding: 5,
  },
  logoutButtonHeader: {
    backgroundColor: 'transparent',
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  appointmentInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
});

export default PatientDashboard;
