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
import { getThemeColor } from '../../utils/constants';

const LoginScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { userType } = route.params || { userType: 'nurse' };
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const themeColor = getThemeColor(userType);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // La navigation se fera automatiquement via AuthContext
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
          <Ionicons
            name={userType === 'nurse' ? 'medkit' : 'heart'}
            size={40}
            color={themeColor}
          />
          <Text style={[styles.title, { color: themeColor }]}>Connexion</Text>
          <Text style={styles.subtitle}>Bienvenue sur SoinLokal</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email input */}
          <View
            style={[
              styles.inputContainer,
              emailFocused && { borderColor: themeColor },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={emailFocused ? themeColor : '#94A3B8'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password input */}
          <View
            style={[
              styles.inputContainer,
              passwordFocused && { borderColor: themeColor },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={passwordFocused ? themeColor : '#94A3B8'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
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

          {/* Login button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themeColor }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword', { userType })}
          >
            <Text style={[styles.forgotPasswordText, { color: themeColor }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register', { userType })}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    marginBottom: 24,
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
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    flex: 1,
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
    marginBottom: 16,
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
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
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

export default LoginScreen;
