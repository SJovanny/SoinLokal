import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../../components/LogoutButton';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  address: string;
  status: 'pending' | 'completed';
}

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  value: number | string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const NurseDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [todayAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientName: 'Marie Dupont',
      time: '09:00',
      type: 'Pansement',
      address: '15 Rue des Flamboyants, Fort-de-France',
      status: 'pending'
    },
    {
      id: '2',
      patientName: 'Jean Martin',
      time: '10:30',
      type: 'Injection',
      address: '8 Avenue des Alizés, Schoelcher',
      status: 'completed'
    },
    {
      id: '3',
      patientName: 'Claire Laroche',
      time: '14:00',
      type: 'Contrôle glycémie',
      address: '22 Rue des Bougainvilliers, Lamentin',
      status: 'pending'
    },
  ]);

  const [stats] = useState({
    totalPatients: 28,
    todayVisits: 5,
    completedToday: 2,
    revenue: 450,
  });

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity 
      style={[
        styles.appointmentCard,
        item.status === 'completed' && styles.completedCard
      ]}
      onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
    >
      <View style={styles.appointmentHeader}>
        <View>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.appointmentType}>{item.type}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{item.time}</Text>
          <Ionicons 
            name={item.status === 'completed' ? 'checkmark-circle' : 'time-outline'} 
            size={20} 
            color={item.status === 'completed' ? '#4CAF50' : '#FF9800'} 
          />
        </View>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.address}>{item.address}</Text>
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
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profil')}
            >
              <Ionicons name="person-circle-outline" size={32} color="#2E8B57" />
            </TouchableOpacity>
            <LogoutButton 
              variant="icon" 
              showText={false}
              style={styles.logoutButtonHeader}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard 
            icon="people-outline" 
            title="Patients" 
            value={stats.totalPatients} 
            color="#2E8B57" 
          />
          <StatCard 
            icon="calendar-outline" 
            title="Visites aujourd'hui" 
            value={stats.todayVisits} 
            color="#4A90E2" 
          />
          <StatCard 
            icon="checkmark-circle-outline" 
            title="Terminées" 
            value={stats.completedToday} 
            color="#4CAF50" 
          />
          <StatCard 
            icon="card-outline" 
            title="Revenus (€)" 
            value={stats.revenue} 
            color="#FF9800" 
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Tournée')}
            >
              <Ionicons name="map-outline" size={24} color="white" />
              <Text style={styles.actionText}>Ma tournée</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
              onPress={() => navigation.navigate('Patients')}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Nouveau patient</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color="white" />
              <Text style={styles.actionText}>Messages</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rendez-vous d'aujourd'hui</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tournée')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {todayAppointments.length > 0 ? (
            <FlatList
              data={todayAppointments}
              renderItem={renderAppointmentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Aucun rendez-vous aujourd'hui</Text>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.activityText}>
                Soins terminés chez Marie Dupont - 08:45
              </Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="document-text" size={20} color="#2E8B57" />
              <Text style={styles.activityText}>
                Rapport de soins envoyé - 08:50
              </Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="chatbubble" size={20} color="#4A90E2" />
              <Text style={styles.activityText}>
                Nouveau message de Jean Martin - 09:15
              </Text>
            </View>
          </View>
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    padding: 20,
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
    color: '#2E8B57',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2E8B57',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  completedCard: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeContainer: {
    alignItems: 'center',
    gap: 5,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  address: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});

export default NurseDashboard;
