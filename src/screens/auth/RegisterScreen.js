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

const RegisterScreen = ({ navigation, route }) => {
  const { userType } = route.params || { userType: 'nurse' };
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Champs spécifiques aux infirmières
    adeli: '',
    specialties: '',
    zone: '',
    // Champs spécifiques aux patients
    address: '',
    emergencyContact: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
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
        ...(userType === 'nurse' ? {
          adeli: formData.adeli,
          specialties: formData.specialties.split(',').map(s => s.trim()),
          zone: formData.zone,
          verified: false, // Les infirmières doivent être vérifiées
        } : {
          address: formData.address,
          emergencyContact: formData.emergencyContact,
        })
      };

      await register(formData.email, formData.password, profile);
      
      Alert.alert(
        'Inscription réussie', 
        userType === 'nurse' 
          ? 'Votre compte a été créé. Il sera activé après vérification de vos informations professionnelles.'
          : 'Votre compte a été créé avec succès.'
      );
    } catch (error) {
      Alert.alert('Erreur d\'inscription', error.message);
    } finally {
      setLoading(false);
    }
  };

  const themeColor = userType === 'nurse' ? '#2E8B57' : '#4A90E2';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons 
              name={userType === 'nurse' ? 'medical' : 'heart'} 
              size={60} 
              color={themeColor} 
            />
            <Text style={[styles.title, { color: themeColor }]}>
              {userType === 'nurse' ? 'Inscription Infirmière' : 'Inscription Patient'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Informations personnelles */}
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Prénom *"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Nom *"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Adresse email *"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Téléphone *"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Champs spécifiques selon le type d'utilisateur */}
            {userType === 'nurse' ? (
              <>
                <Text style={styles.sectionTitle}>Informations professionnelles</Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Numéro ADELI *"
                    value={formData.adeli}
                    onChangeText={(value) => handleInputChange('adeli', value)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Zone d'intervention"
                    value={formData.zone}
                    onChangeText={(value) => handleInputChange('zone', value)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="medical-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Spécialités (séparées par des virgules)"
                    value={formData.specialties}
                    onChangeText={(value) => handleInputChange('specialties', value)}
                    multiline
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Informations complémentaires</Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="home-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse"
                    value={formData.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    multiline
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="person-add-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contact d'urgence"
                    value={formData.emergencyContact}
                    onChangeText={(value) => handleInputChange('emergencyContact', value)}
                  />
                </View>
              </>
            )}

            {/* Mot de passe */}
            <Text style={styles.sectionTitle}>Sécurité</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe *"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe *"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, { backgroundColor: themeColor }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.registerButtonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login', { userType })}
            >
              <Text style={[styles.loginLink, { color: themeColor }]}>
                Se connecter
              </Text>
            </TouchableOpacity>
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
  content: {
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  form: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  registerButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
