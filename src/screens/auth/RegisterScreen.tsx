import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { getThemeColor, COLORS } from '../../utils/constants';
import { validateEmail, handleAuthError } from '../../utils/helpers';
import { debugLog } from '../../utils/devConfig';

const LEGAL_TEXT = `En cochant cette case et en soumettant ce formulaire, vous certifiez que :

1. Vous êtes le titulaire légitime du numéro RPPS renseigné ci-dessus, et que celui-ci correspond bien à votre identité et à votre diplôme d'État d'infirmier(ère).

2. Les informations fournies (nom, prénom, coordonnées) sont exactes et vous engagent en cas de contrôle.

3. Vous comprenez que la vérification automatique de ce numéro RPPS s'appuie sur l'Annuaire Santé (API publique de l'Agence du Numérique en Santé) et porte uniquement sur l'existence, le statut actif et la profession associée au numéro — et non sur la correspondance avec votre identité déclarée.

4. Toute fausse déclaration est passible de sanctions et pourra entraîner la suspension immédiate de votre compte, sans préavis, ainsi que d'éventuelles poursuites conformément à la législation en vigueur (usurpation d'identité professionnelle, faux et usage de faux).

5. SoinLokal se réserve le droit de demander à tout moment un justificatif complémentaire (carte CPS, attestation de l'Ordre infirmier, diplôme) afin de confirmer votre identité et votre qualification professionnelle.

En cochant la case ci-dessous, vous reconnaissez avoir lu, compris et accepté l'ensemble de ces conditions.`;

const RegisterScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { userType: initialUserType } = route.params || { userType: 'nurse' };
  const { register } = useAuth();

  const [userType, setUserType] = useState<'patient' | 'family' | 'nurse'>(initialUserType);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Nurse-specific fields
    rppsNumber: '',
    specialties: '',
    zone: '',
    // Patient-specific fields
    address: '',
    emergencyContact: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalScrolledToBottom, setLegalScrolledToBottom] = useState(false);
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);

  const themeColor = getThemeColor(userType);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLegalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isCloseToBottom) setLegalScrolledToBottom(true);
  };

  const validateForm = (): boolean => {
    const { email, password, confirmPassword, firstName, lastName, phone } = formData;

    if (!email || !password || !firstName || !lastName || !phone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Erreur', "L'adresse email est invalide");
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

    if (userType === 'nurse' && !formData.rppsNumber) {
      Alert.alert('Erreur', 'Le numéro RPPS est obligatoire pour les infirmières');
      return false;
    }

    if (userType === 'nurse' && !/^\d{11}$/.test(formData.rppsNumber.trim())) {
      Alert.alert('Erreur', 'Le numéro RPPS doit contenir 11 chiffres (depuis 2021, il remplace l\'ADELI pour les infirmières)');
      return false;
    }

    if (userType === 'nurse' && !acceptedDeclaration) {
      Alert.alert('Erreur', 'Vous devez accepter la déclaration sur l\'honneur pour continuer');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let verificationStatus: 'pending_docs' | 'pending' = 'pending';

      if (userType === 'nurse') {
        // Verify the RPPS number against the ANS "Annuaire Santé" registry
        // before creating the account. Registration is blocked if verification
        // fails or is unavailable.
        try {
          const { data, error } = await supabase.functions.invoke('verify-rpps', {
            body: {
              rppsNumber: formData.rppsNumber.trim(),
            },
          });

          if (error) {
            debugLog('RPPS verification - Supabase function error', error);
            Alert.alert(
              'Vérification impossible',
              'Le service de vérification RPPS est indisponible. Veuillez réessayer ultérieurement.',
            );
            setLoading(false);
            return;
          } else if (data?.status === 'verified') {
            verificationStatus = 'pending_docs';
          } else if (data?.status === 'not_found' || data?.status === 'not_a_nurse' || data?.status === 'inactive') {
            debugLog('RPPS verification failed', { status: data.status, message: data.message, rppsNumber: formData.rppsNumber.trim() });
            Alert.alert(
              'Vérification impossible',
              data.message ??
                "Nous n'avons pas pu confirmer ce numéro RPPS. Vérifiez votre saisie ou contactez le support.",
            );
            setLoading(false);
            return;
          } else {
            debugLog('RPPS verification - function returned error status', { status: data?.status, message: data?.message });
            Alert.alert(
              'Vérification impossible',
              data?.message ?? "Le service de vérification RPPS est indisponible. Veuillez réessayer ultérieurement.",
            );
            setLoading(false);
            return;
          }
        } catch (err) {
          debugLog('RPPS verification - network exception', err);
          Alert.alert(
            'Erreur réseau',
            'Impossible de contacter le service de vérification. Vérifiez votre connexion internet et réessayez.',
          );
          setLoading(false);
          return;
        }
      }

      const profile = {
        userType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        ...(userType === 'nurse'
          ? {
              rppsNumber: formData.rppsNumber.trim(),
              verificationStatus,
              specialties: formData.specialties.split(',').map(s => s.trim()),
              zone: formData.zone,
              verified: false,
            }
          : userType === 'patient'
          ? {
              address: formData.address,
              emergencyContact: formData.emergencyContact,
            }
          : {
              // Family — no extra fields needed
            }),
      };

      await register(formData.email.trim(), formData.password, profile);

      Alert.alert(
        'Inscription réussie',
        userType === 'nurse'
          ? 'Votre compte a été créé. Veuillez maintenant soumettre vos documents de vérification (carte d\'identité, justificatif de domicile, carte professionnelle) pour activer votre compte.'
          : userType === 'family'
          ? 'Votre compte proche a été créé avec succès. L\'équipe soignante pourra vous lier au dossier de votre proche.'
          : 'Votre compte a été créé avec succès.',
      );
    } catch (error: any) {
      Alert.alert("Erreur d'inscription", handleAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
              : userType === 'family'
              ? 'Suivez les soins de votre proche'
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
                placeholder="Numéro RPPS (11 chiffres) *"
                placeholderTextColor="#94A3B8"
                value={formData.rppsNumber}
                onChangeText={v => handleInputChange('rppsNumber', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={11}
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

            <View style={styles.legalBox}>
              <ScrollView
                style={styles.legalScrollView}
                onScroll={handleLegalScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled
              >
                <Text style={styles.legalText}>{LEGAL_TEXT}</Text>
              </ScrollView>
              {!legalScrolledToBottom && (
                <Text style={styles.legalHint}>Faites défiler le texte ci-dessus jusqu'en bas pour continuer</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => legalScrolledToBottom && setAcceptedDeclaration(!acceptedDeclaration)}
              disabled={!legalScrolledToBottom}
            >
              <Ionicons
                name={acceptedDeclaration ? 'checkbox' : 'square-outline'}
                size={22}
                color={legalScrolledToBottom ? themeColor : '#CBD5E1'}
              />
              <Text style={[styles.checkboxLabel, !legalScrolledToBottom && styles.checkboxLabelDisabled]}>
                Je certifie être le titulaire de ce numéro RPPS et accepte les conditions ci-dessus
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informations complémentaires</Text>
            </View>

            {/* Subtle role toggle */}
            <View style={styles.roleToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleToggleBtn,
                  userType === 'patient' && { backgroundColor: COLORS.PATIENT_LIGHT, borderColor: COLORS.PATIENT_PRIMARY },
                ]}
                onPress={() => setUserType('patient')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={userType === 'patient' ? COLORS.PATIENT_PRIMARY : COLORS.TEXT_MUTED}
                />
                <Text style={[
                  styles.roleToggleText,
                  userType === 'patient' && { color: COLORS.PATIENT_PRIMARY, fontWeight: '600' },
                ]}>Patient</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleToggleBtn,
                  userType === 'family' && { backgroundColor: COLORS.FAMILY_LIGHT, borderColor: COLORS.FAMILY_PRIMARY },
                ]}
                onPress={() => setUserType('family')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={userType === 'family' ? COLORS.FAMILY_PRIMARY : COLORS.TEXT_MUTED}
                />
                <Text style={[
                  styles.roleToggleText,
                  userType === 'family' && { color: COLORS.FAMILY_PRIMARY, fontWeight: '600' },
                ]}>Proche / Famille</Text>
              </TouchableOpacity>
            </View>

            {userType === 'patient' && (
              <>
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
              </>
            )}

            {userType === 'family' && (
              <View style={styles.familyHint}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.FAMILY_PRIMARY} />
                <Text style={styles.familyHintText}>
                  En tant que proche, vous pourrez suivre les soins et rendez-vous de votre aidé, et communiquer avec l'équipe soignante.
                </Text>
              </View>
            )}
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
      </KeyboardAvoidingView>
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
  roleToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  roleToggleText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  familyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.FAMILY_LIGHT,
    padding: 16,
    borderRadius: 12,
  },
  familyHintText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.FAMILY_DARK,
    lineHeight: 20,
  },
  legalBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0D060',
    padding: 12,
    marginBottom: 12,
  },
  legalScrollView: {
    maxHeight: 150,
  },
  legalText: {
    fontSize: 13,
    color: '#4A4A4A',
    lineHeight: 19,
  },
  legalHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A2E',
    lineHeight: 19,
  },
  checkboxLabelDisabled: {
    color: '#CBD5E1',
  },
});

export default RegisterScreen;
