import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getThemeColor } from '../../utils/constants';

const RegisterScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { userType } = route.params || { userType: 'nurse' };
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Nurse-specific fields
    adeli: '',
    specialties: '',
    zone: '',
    // Patient-specific fields
    address: '',
    emergencyContact: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const themeColor = getThemeColor(userType);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const { email, password, confirmPassword, firstName, lastName, phone } = formData;

    if (!email || !password || !firstName || !lastName || !phone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (userType === 'nurse' && !formData.adeli) {
      Alert.alert('Erreur', 'Le numéro ADELI est obligatoire pour les infirmières');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const profile = {
        userType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        ...(userType === 'nurse'
          ? {
              adeli: formData.adeli,
              specialties: formData.specialties.split(',').map(s => s.trim()),
              zone: formData.zone,
              verified: false, // Infirmières doivent être vérifiées
            }
          : {
              address: formData.address,
              emergencyContact: formData.emergencyContact,
            }),
      };

      await register(formData.email, formData.password, profile);

      Alert.alert(
        'Inscription réussie',
        userType === 'nurse'
          ? 'Votre compte a été créé. Il sera activé après vérification de vos informations professionnelles.'
          : 'Votre compte a été créé avec succès.',
      );
    } catch (error: any) {
      Alert.alert("Erreur d'inscription", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#64748B" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColor }]}>Créer un compte</Text>
          <Text style={styles.headerSubtitle}>
            {userType === 'nurse'
              ? 'Rejoignez le réseau des infirmières libérales'
              : 'Accédez à vos soins en toute simplicité'}
          </Text>
        </View>

        {/* Section: Informations personnelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.rowInput, styles.rowInputLeft]}>
              <TextInput
                style={styles.input}
                placeholder="Prénom *"
                placeholderTextColor="#94A3B8"
                value={formData.firstName}
                onChangeText={v => handleInputChange('firstName', v)}
              />
            </View>
            <View style={[styles.inputContainer, styles.rowInput]}>
              <TextInput
                style={styles.input}
                placeholder="Nom *"
                placeholderTextColor="#94A3B8"
                value={formData.lastName}
                onChangeText={v => handleInputChange('lastName', v)}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Adresse email *"
              placeholderTextColor="#94A3B8"
              value={formData.email}
              onChangeText={v => handleInputChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Téléphone *"
              placeholderTextColor="#94A3B8"
              value={formData.phone}
              onChangeText={v => handleInputChange('phone', v)}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Section: Professional (nurse) or Complementary (patient) */}
        {userType === 'nurse' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informations professionnelles</Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Numéro ADELI *"
                placeholderTextColor="#94A3B8"
                value={formData.adeli}
                onChangeText={v => handleInputChange('adeli', v)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Zone d'intervention (commune)"
                placeholderTextColor="#94A3B8"
                value={formData.zone}
                onChangeText={v => handleInputChange('zone', v)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="medical-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Spécialités (séparées par des virgules)"
                placeholderTextColor="#94A3B8"
                value={formData.specialties}
                onChangeText={v => handleInputChange('specialties', v)}
                multiline
              />
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informations complémentaires</Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Adresse"
                placeholderTextColor="#94A3B8"
                value={formData.address}
                onChangeText={v => handleInputChange('address', v)}
                multiline
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-add-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contact d'urgence"
                placeholderTextColor="#94A3B8"
                value={formData.emergencyContact}
                onChangeText={v => handleInputChange('emergencyContact', v)}
              />
            </View>
          </View>
        )}

        {/* Section: Sécurité */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sécurité</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe *"
              placeholderTextColor="#94A3B8"
              value={formData.password}
              onChangeText={v => handleInputChange('password', v)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe *"
              placeholderTextColor="#94A3B8"
              value={formData.confirmPassword}
              onChangeText={v => handleInputChange('confirmPassword', v)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themeColor }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login', { userType })}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  rowInput: {
    flex: 1,
  },
  rowInputLeft: {
    marginRight: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 15,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
