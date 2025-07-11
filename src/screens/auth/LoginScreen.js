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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { TEST_ACCOUNTS_INFO } from '../../utils/testUsers';

const LoginScreen = ({ navigation, route }) => {
  const { userType } = route.params || { userType: 'nurse' };
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // La navigation se fera automatiquement via AuthContext
    } catch (error) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  const themeColor = userType === 'nurse' ? '#2E8B57' : '#4A90E2';

  return (
    <SafeAreaView style={styles.container}>
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
            size={80} 
            color={themeColor} 
          />
          <Text style={[styles.title, { color: themeColor }]}>
            {userType === 'nurse' ? 'Espace Infirmière' : 'Espace Patient'}
          </Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: themeColor }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Information', 'Fonctionnalité à venir')}
          >
            <Text style={[styles.forgotPasswordText, { color: themeColor }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* Section des comptes de test */}
          <View style={styles.testAccountsSection}>
            <Text style={styles.testAccountsTitle}>🔧 Comptes de test disponibles :</Text>
            
            {TEST_ACCOUNTS_INFO.map((account, index) => (
              <TouchableOpacity
                key={index}
                style={styles.testAccountCard}
                onPress={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                <Text style={styles.testAccountType}>{account.type}</Text>
                <Text style={styles.testAccountCredential}>📧 {account.email}</Text>
                <Text style={styles.testAccountCredential}>🔑 {account.password}</Text>
                <Text style={styles.testAccountDescription}>{account.description}</Text>
                <Text style={styles.tapToFillText}>👆 Appuyez pour remplir automatiquement</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register', { userType })}
          >
            <Text style={[styles.registerLink, { color: themeColor }]}>
              S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    flex: 1,
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
  loginButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
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
  registerLink: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testAccountsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  testAccountsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 15,
    textAlign: 'center',
  },
  testAccountCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4299e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  testAccountType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 5,
  },
  testAccountCredential: {
    fontSize: 12,
    color: '#4a5568',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  testAccountDescription: {
    fontSize: 11,
    color: '#718096',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  tapToFillText: {
    fontSize: 10,
    color: '#4299e1',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default LoginScreen;
