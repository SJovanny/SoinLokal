import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const UserTypeScreen = ({ navigation }) => {
  const handleUserTypeSelection = (userType) => {
    navigation.navigate('Login', { userType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#43A047']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.userTypeButton, styles.nurseButton]}
              onPress={() => handleUserTypeSelection('nurse')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainer}>
                <Ionicons name="medical" size={50} color="#2E8B57" />
              </View>
              <Text style={styles.buttonTitle}>Je suis Infirmière</Text>
              <Text style={styles.buttonSubtitle}>
                Gérez vos patients et optimisez vos tournées
              </Text>
              <View style={styles.buttonArrow}>
                <Ionicons name="chevron-forward" size={24} color="#2E8B57" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.userTypeButton, styles.patientButton]}
              onPress={() => handleUserTypeSelection('patient')}
              activeOpacity={0.8}
            >
              <View style={[styles.buttonIconContainer, styles.patientIconContainer]}>
                <Ionicons name="heart" size={50} color="#4A90E2" />
              </View>
              <Text style={styles.buttonTitle}>Je suis Patient/Famille</Text>
              <Text style={styles.buttonSubtitle}>
                Suivez vos soins et communiquez avec votre infirmière
              </Text>
              <View style={[styles.buttonArrow, styles.patientArrow]}>
                <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerDivider} />
          
            <Text style={styles.footerSubtext}>
              Sécurisé • Certifié • Confidentiel
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.06,
    marginBottom: 20,
  },
 

  title: {
    fontSize: 42,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '300',
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 40,
  },
  userTypeButton: {
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    position: 'relative',
    minHeight: height * 0.18,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  nurseButton: {
    borderLeftWidth: 5,
    borderLeftColor: '#2E8B57',
  },
  patientButton: {
    borderLeftWidth: 5,
    borderLeftColor: '#4A90E2',
  },
  buttonIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 139, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  patientIconContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonSubtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 15,
    fontWeight: '400',
  },
  buttonArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 139, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientArrow: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  footerDivider: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});

export default UserTypeScreen;
