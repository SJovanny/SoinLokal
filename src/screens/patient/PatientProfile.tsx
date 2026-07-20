import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type PatientProfile as PatientProfileData } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import LogoutButton from '../../components/LogoutButton';
import AvatarPicker from '../../components/AvatarPicker';
import HelpSection from '../../components/HelpSection';
import ThemeSelector from '../../components/ThemeSelector';
import OnboardingModal from '../../components/OnboardingModal';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PatientProfileScreen: React.FC = () => {
  const { userProfile, patientProfile, fetchProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Editable fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');

  const startEditing = () => {
    setEditFirstName(userProfile?.first_name ?? '');
    setEditLastName(userProfile?.last_name ?? '');
    setEditPhone(userProfile?.phone ?? '');
    setEditAddress(patientProfile?.address ?? '');
    setEditEmergencyContact(patientProfile?.emergency_contact ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!user || !userProfile) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          phone: editPhone.trim(),
        })
        .eq('id', user.id);

      if (profileError) {
        Alert.alert('Erreur', profileError.message);
        return;
      }

      const { error: patientError } = await supabase
        .from('patient_profiles')
        .update({
          address: editAddress.trim(),
          emergency_contact: editEmergencyContact.trim(),
        })
        .eq('profile_id', user.id);

      if (patientError) {
        Alert.alert('Erreur', patientError.message);
        return;
      }

      await fetchProfile(user.id);
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        {isEditing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={cancelEditing} style={styles.headerCancelBtn}>
              <Text style={styles.headerCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveProfile}
              disabled={saving}
              style={[styles.headerSaveBtn, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.headerSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="create-outline" size={20} color={COLORS.PATIENT_PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <AvatarPicker
            photoUrl={userProfile?.photo_url}
            avatarType={userProfile?.avatar_type ?? null}
            avatarSeed={userProfile?.avatar_seed}
            firstName={userProfile?.first_name}
            lastName={userProfile?.last_name}
            userId={user?.id ?? ''}
            onSaved={() => {
              fetchProfile(user!.id);
            }}
          />
          {isEditing ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Prénom"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />
              <TextInput
                style={styles.editNameInput}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Nom"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />
            </View>
          ) : (
            <Text style={styles.userName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
          )}
          <Text style={styles.userRole}>Patient</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Personal info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.TEXT_MUTED} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Téléphone"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{userProfile?.phone || 'Non renseigné'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={20} color={COLORS.TEXT_MUTED} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Adresse"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                />
              ) : (
                <Text style={styles.infoValue}>{patientProfile?.address || 'Non renseigné'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.TEXT_MUTED} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact d'urgence</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editEmergencyContact}
                  onChangeText={setEditEmergencyContact}
                  placeholder="Nom - Téléphone"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                />
              ) : (
                <Text style={styles.infoValue}>{patientProfile?.emergency_contact || 'Non renseigné'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Medical info (read-only) */}
        {patientProfile?.medical_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes médicales</Text>
            <Text style={styles.infoValue}>{patientProfile.medical_notes}</Text>
          </View>
        )}

        {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies</Text>
            <View style={styles.tagRow}>
              {patientProfile.allergies.map((a, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Appearance */}
        <ThemeSelector accentColor={COLORS.PATIENT_PRIMARY} />

        {/* Help & Support */}
        <HelpSection
          userType="patient"
          onRestartTutorial={() => setShowOnboarding(true)}
        />

        {/* Logout */}
        <View style={styles.logoutSection}>
          <LogoutButton variant="danger" style={styles.logoutButton} />
        </View>
      </ScrollView>

      <OnboardingModal
        visible={showOnboarding}
        userType={userProfile?.user_type ?? 'patient'}
        onClose={() => setShowOnboarding(false)}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.PATIENT_PRIMARY,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.MD,
  },
  headerCancelBtn: {
    paddingVertical: SIZES.XS,
    paddingHorizontal: SIZES.SM,
  },
  headerCancelText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  headerSaveBtn: {
    backgroundColor: COLORS.PATIENT_PRIMARY,
    paddingVertical: SIZES.XS,
    paddingHorizontal: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_SM,
  },
  headerSaveText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Profile card
  profileCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    padding: SIZES.XL,
    alignItems: 'center',
    marginBottom: SIZES.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  userName: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  userRole: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.PATIENT_PRIMARY,
    fontWeight: '600',
    marginTop: 2,
  },
  userEmail: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    gap: SIZES.SM,
    marginTop: SIZES.XS,
  },
  editNameInput: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.PATIENT_PRIMARY,
    paddingVertical: SIZES.XS,
    textAlign: 'center',
  },
  // Sections
  section: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SIZES.MD,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.MD,
  },
  infoContent: {
    marginLeft: SIZES.MD,
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  editInput: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.PATIENT_PRIMARY,
    paddingVertical: SIZES.XS,
  },
  // Tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.SM,
  },
  tag: {
    backgroundColor: COLORS.WARNING,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  tagText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  // Logout
  logoutSection: {
    paddingVertical: SIZES.XL,
    alignItems: 'center',
  },
  logoutButton: {
    minWidth: 200,
  },
});

export default PatientProfileScreen;
