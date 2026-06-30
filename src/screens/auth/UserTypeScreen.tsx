import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const UserTypeScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A3A2A', '#2E8B57', '#43A047']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={48} color="#2E8B57" />
            </View>
            <Text style={styles.appName}>SoinLokal</Text>
            <Text style={styles.appTagline}>Soins à domicile en Martinique</Text>
          </View>

          {/* Role cards */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={[styles.card, styles.nurseCard]}
              onPress={() => navigation.navigate('Login', { userType: 'nurse' })}
              activeOpacity={0.85}
            >
              <View style={styles.nurseIconBg}>
                <Ionicons name="medkit" size={30} color="#2E8B57" />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>Infirmière libérale</Text>
                <Text style={styles.cardSubtitle}>Gérez vos patients et tournées</Text>
              </View>
              <View style={styles.nurseChevronBg}>
                <Ionicons name="chevron-forward" size={20} color="#2E8B57" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, styles.patientCard]}
              onPress={() => navigation.navigate('Login', { userType: 'patient' })}
              activeOpacity={0.85}
            >
              <View style={styles.patientIconBg}>
                <Ionicons name="person" size={30} color="#4A90E2" />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>Patient / Famille</Text>
                <Text style={styles.cardSubtitle}>Suivez vos soins et rendez-vous</Text>
              </View>
              <View style={styles.patientChevronBg}>
                <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>Sécurisé • Certifié • RGPD</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: height * 0.06,
    paddingBottom: 36,
  },
  // Logo area
  logoArea: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.70)',
  },
  // Cards
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    marginVertical: 8,
  },
  nurseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  patientCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  nurseIconBg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 139, 87, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientIconBg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  nurseChevronBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46, 139, 87, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  patientChevronBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  // Footer
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default UserTypeScreen;
