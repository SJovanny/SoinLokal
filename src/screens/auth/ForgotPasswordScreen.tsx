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

const ForgotPasswordScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { userType } = route.params || { userType: 'nurse' };
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [success, setSuccess] = useState(false);

  const themeColor = getThemeColor(userType);

  const handleResetPassword = async () => {
    if (!email) {
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      // Re-show error inline or via alert — keep the form visible so user can retry
      setSuccess(false);
      // Surface the error to the user
      const { Alert } = require('react-native');
      Alert.alert('Erreur', error.message);
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

        {success ? (
          /* Success state */
          <View style={styles.successContainer}>
            <View style={[styles.successIconBg, { backgroundColor: `${themeColor}18` }]}>
              <Ionicons name="checkmark-circle" size={64} color={themeColor} />
            </View>
            <Text style={[styles.successTitle, { color: themeColor }]}>Email envoyé !</Text>
            <Text style={styles.successMessage}>
              Vérifiez votre boîte mail et suivez le lien pour réinitialiser votre mot de passe.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: themeColor }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Form state */
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerIconBg, { backgroundColor: `${themeColor}18` }]}>
                <Ionicons name="lock-closed" size={52} color={themeColor} />
              </View>
              <Text style={[styles.title, { color: themeColor }]}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View
                style={[
                  styles.inputContainer,
                  emailFocused && { borderColor: themeColor },
                ]}
              >
                <Ionicons
                  name="mail-outline"
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

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: themeColor },
                  !email && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={loading || !email}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Envoyer le lien</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
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
  // Form state
  header: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  headerIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  form: {
    gap: 0,
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
    marginBottom: 20,
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
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 8,
    paddingBottom: 60,
  },
  successIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});

export default ForgotPasswordScreen;
