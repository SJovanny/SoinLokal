import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase, type NurseAddress } from '../../utils/supabase';
import { getColors, SIZES } from '../../utils/constants';
import { searchAddressMapbox, type MapboxGeocodingResult } from '../../utils/mapboxGeocoding';
import { searchAddress } from '../../utils/geocoding';
import { nativeGeocode } from '../../utils/nativeGeocoding';
import LogoutButton from '../../components/LogoutButton';
import AvatarPicker from '../../components/AvatarPicker';
import HelpSection from '../../components/HelpSection';
import ThemeSelector from '../../components/ThemeSelector';
import OnboardingModal from '../../components/OnboardingModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile, nurseProfile, patientProfile, fetchProfile, user } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addresses, setAddresses] = useState<NurseAddress[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New address form
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [selectedGPS, setSelectedGPS] = useState<{ lat: number; lng: number } | null>(null);

  // Address search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxGeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [editSpecialties, setEditSpecialties] = useState('');
  const [editZone, setEditZone] = useState('');

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // -------------------------------------------------------------------------
  // Load addresses
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (nurseProfile?.addresses) {
      setAddresses(nurseProfile.addresses);
    } else if (nurseProfile?.address) {
      // Migrate old single address to array
      const migrated: NurseAddress = {
        id: generateId(),
        label: 'Cabinet',
        address: nurseProfile.address,
        gps_lat: nurseProfile.gps_lat ?? null,
        gps_lng: nurseProfile.gps_lng ?? null,
        is_primary: true,
      };
      setAddresses([migrated]);
    }
  }, [nurseProfile]);

  // -------------------------------------------------------------------------
  // Profile editing
  // -------------------------------------------------------------------------

  const startEditing = () => {
    setEditFirstName(userProfile?.first_name ?? '');
    setEditLastName(userProfile?.last_name ?? '');
    setEditPhone(userProfile?.phone ?? '');
    setEditSpecialties(nurseProfile?.specialties?.join(', ') ?? '');
    setEditZone(nurseProfile?.zone ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!user || !userProfile) return;
    setSavingProfile(true);
    try {
      const specialties = editSpecialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

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

      if (userProfile.user_type === 'nurse') {
        const { error: nurseError } = await supabase
          .from('nurse_profiles')
          .update({
            specialties,
            zone: editZone.trim(),
          })
          .eq('profile_id', user.id);

        if (nurseError) {
          Alert.alert('Erreur', nurseError.message);
          return;
        }
      }

      await fetchProfile(user.id);
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setSavingProfile(false);
    }
  };

  // -------------------------------------------------------------------------
  // Address search (debounced)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      // Prefer Mapbox geocoding (aligned with map tiles → pins match Waze/Google).
      let results = await searchAddressMapbox(searchQuery);
      // Fallback to BAN if Mapbox returned nothing or token missing.
      if (results.length === 0) {
        const ban = await searchAddress(searchQuery);
        results = ban.map(b => ({
          id: `${b.lat},${b.lng}`,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
        }));
      }
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // -------------------------------------------------------------------------
  // Save addresses
  // -------------------------------------------------------------------------

  const saveAddresses = async (updated: NurseAddress[]) => {
    if (!user) return;
    setSaving(true);
    try {
      // Also update the primary address/gps_lat/gps_lng columns for backward compatibility
      const primary = updated.find(a => a.is_primary) ?? updated[0];

      const { error } = await supabase
        .from('nurse_profiles')
        .update({
          addresses: updated,
          address: primary?.address ?? null,
          gps_lat: primary?.gps_lat ?? null,
          gps_lng: primary?.gps_lng ?? null,
        })
        .eq('profile_id', user.id);

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      setAddresses(updated);
      // Refresh profile in auth context
      await fetchProfile(user.id);
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Add address
  // -------------------------------------------------------------------------

  const handleAddAddress = async () => {
    if (!newLabel.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un libellé (ex: Cabinet, Domicile).');
      return;
    }
    if (!newAddress.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse.');
      return;
    }
    if (!selectedGPS) {
      Alert.alert(
        'Erreur',
        'Veuillez sélectionner une adresse dans les suggestions pour valider le GPS.'
      );
      return;
    }

    const newAddr: NurseAddress = {
      id: generateId(),
      label: newLabel.trim(),
      address: newAddress.trim(),
      gps_lat: selectedGPS.lat,
      gps_lng: selectedGPS.lng,
      is_primary: addresses.length === 0, // first address is primary
    };

    const updated = [...addresses, newAddr];
    await saveAddresses(updated);

    // Reset form
    setNewLabel('');
    setNewAddress('');
    setSearchQuery('');
    setSelectedGPS(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setShowAddModal(false);
  };

  // -------------------------------------------------------------------------
  // Set primary
  // -------------------------------------------------------------------------

  const handleSetPrimary = (id: string) => {
    const updated = addresses.map(a => ({
      ...a,
      is_primary: a.id === id,
    }));
    saveAddresses(updated);
  };

  // -------------------------------------------------------------------------
  // Delete address
  // -------------------------------------------------------------------------

  const handleDelete = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;

    Alert.alert("Supprimer l'adresse", `Supprimer "${addr.label}" — ${addr.address} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          const updated = addresses.filter(a => a.id !== id);
          // If we deleted the primary, make the first remaining one primary
          if (addr.is_primary && updated.length > 0) {
            updated[0].is_primary = true;
          }
          saveAddresses(updated);
        },
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const getRoleLabel = () => {
    switch (userProfile?.user_type) {
      case 'nurse':
        return 'Infirmière libérale';
      case 'family':
        return 'Famille';
      default:
        return 'Patient';
    }
  };

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
              disabled={savingProfile}
              style={[styles.headerSaveBtn, savingProfile && { opacity: 0.6 }]}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color={colors.WHITE} />
              ) : (
                <Text style={styles.headerSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={startEditing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={colors.NURSE_PRIMARY} />
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
            photoOnly
            onSaved={data => {
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
                placeholderTextColor={colors.TEXT_MUTED}
              />
              <TextInput
                style={styles.editNameInput}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Nom"
                placeholderTextColor={colors.TEXT_MUTED}
              />
            </View>
          ) : (
            <Text style={styles.userName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
          )}
          <Text style={styles.userRole}>{getRoleLabel()}</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Professional info */}
        {userProfile?.user_type === 'nurse' && nurseProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations professionnelles</Text>

            <View style={styles.infoRow}>
              <Ionicons name="id-card-outline" size={20} color={colors.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>N° RPPS</Text>
                <Text style={styles.infoValue}>{nurseProfile.rpps_number || 'Non renseigné'}</Text>
                {nurseProfile.verification_status === 'verified' && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#2E8B57" />
                    <Text style={styles.verifiedBadgeText}>Vérifié</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={colors.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Téléphone"
                    placeholderTextColor={colors.TEXT_MUTED}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>{userProfile.phone || 'Non renseigné'}</Text>
                )}
              </View>
            </View>

            {(isEditing || (nurseProfile.specialties && nurseProfile.specialties.length > 0)) && (
              <View style={styles.infoRow}>
                <Ionicons name="medical-outline" size={20} color={colors.TEXT_MUTED} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Spécialités</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editSpecialties}
                      onChangeText={setEditSpecialties}
                      placeholder="Soins généraux, Injections..."
                      placeholderTextColor={colors.TEXT_MUTED}
                    />
                  ) : (
                    <Text style={styles.infoValue}>{nurseProfile.specialties?.join(', ')}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color={colors.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Zone d'intervention</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editZone}
                    onChangeText={setEditZone}
                    placeholder="Zone d'intervention"
                    placeholderTextColor={colors.TEXT_MUTED}
                  />
                ) : (
                  <Text style={styles.infoValue}>{nurseProfile.zone || 'Non renseigné'}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Addresses section */}
        {userProfile?.user_type === 'nurse' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>Mes adresses</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={18} color={colors.WHITE} />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <Ionicons name="location-outline" size={32} color={colors.BORDER} />
                <Text style={styles.emptyText}>Aucune adresse enregistrée</Text>
                <Text style={styles.emptySubtext}>
                  Ajoutez votre cabinet, domicile, ou autres lieux de passage.
                </Text>
              </View>
            ) : (
              addresses.map(addr => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <View style={styles.addressLabelRow}>
                      <Ionicons
                        name={addr.is_primary ? 'star' : 'location-outline'}
                        size={16}
                        color={addr.is_primary ? colors.NURSE_PRIMARY : colors.TEXT_MUTED}
                      />
                      <Text
                        style={[styles.addressLabel, addr.is_primary && styles.addressLabelPrimary]}
                      >
                        {addr.label}
                      </Text>
                      {addr.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Principal</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.addressActions}>
                      {!addr.is_primary && (
                        <TouchableOpacity
                          onPress={() => handleSetPrimary(addr.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="star-outline" size={18} color={colors.TEXT_MUTED} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(addr.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.DANGER} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.addressText}>{addr.address}</Text>
                  {addr.gps_lat != null && addr.gps_lng != null && (
                    <Text style={styles.addressGPS}>
                      GPS: {addr.gps_lat.toFixed(4)}, {addr.gps_lng.toFixed(4)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Appearance */}
        <ThemeSelector accentColor={colors.NURSE_PRIMARY} />

        {/* Help & Support */}
        <HelpSection userType="nurse" onRestartTutorial={() => setShowOnboarding(true)} />

        {/* Logout */}
        <View style={styles.logoutSection}>
          <LogoutButton variant="danger" style={styles.logoutButton} />
        </View>
      </ScrollView>

      <OnboardingModal
        visible={showOnboarding}
        userType={userProfile?.user_type ?? 'nurse'}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Add Address Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle adresse</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Libellé *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="bookmark-outline" size={20} color={colors.TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Cabinet, Domicile, Résidence..."
                    placeholderTextColor={colors.TEXT_MUTED}
                    value={newLabel}
                    onChangeText={setNewLabel}
                  />
                </View>

                <Text style={styles.inputLabel}>Adresse *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="search-outline" size={20} color={colors.TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Chercher une adresse..."
                    placeholderTextColor={colors.TEXT_MUTED}
                    value={searchQuery}
                    onChangeText={t => {
                      setSearchQuery(t);
                      setSelectedGPS(null);
                      setNewAddress(t);
                    }}
                    multiline
                  />
                  {searching && <ActivityIndicator size="small" color={colors.NURSE_PRIMARY} />}
                </View>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {suggestions.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionItem}
                        onPress={async () => {
                          setNewAddress(s.address);
                          setSearchQuery(s.address);
                          setShowSuggestions(false);
                          // Use native geocoder (CLGeocoder on iOS, Geocoder on
                          // Android) so coords match the native map tiles exactly.
                          // Fallback to suggestion coords (Mapbox/BAN) if native
                          // geocoding fails.
                          const native = await nativeGeocode(s.address);
                          if (native) {
                            setSelectedGPS({ lat: native.lat, lng: native.lng });
                          } else {
                            setSelectedGPS({ lat: s.lat, lng: s.lng });
                          }
                        }}
                      >
                        <Ionicons name="location-outline" size={16} color={colors.NURSE_PRIMARY} />
                        <Text style={styles.suggestionText} numberOfLines={2}>
                          {s.address}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.suggestionsCredit}>
                      <Text style={styles.suggestionsCreditText}>
                        Données © Mapbox · OpenStreetMap
                      </Text>
                    </View>
                  </View>
                )}

                {/* No results message */}
                {!searching && searchQuery.trim().length >= 3 && suggestions.length === 0 && (
                  <View style={styles.noResults}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.WARNING} />
                    <Text style={styles.noResultsText}>
                      Aucune adresse trouvée. Essayez un autre mot-clé.
                    </Text>
                  </View>
                )}

                {/* GPS confirmation */}
                {selectedGPS && (
                  <View style={styles.gpsConfirm}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.SUCCESS} />
                    <Text style={styles.gpsConfirmText}>
                      GPS validé : {selectedGPS.lat.toFixed(4)}, {selectedGPS.lng.toFixed(4)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleAddAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.WHITE} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.WHITE} />
                      <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    header: {
      paddingHorizontal: SIZES.LG,
      paddingVertical: SIZES.MD,
      backgroundColor: colors.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    headerTitle: {
      fontSize: SIZES.FONT_2XL,
      fontWeight: '700',
      color: colors.NURSE_PRIMARY,
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
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_LG,
      padding: SIZES.XL,
      alignItems: 'center',
      marginBottom: SIZES.MD,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.NURSE_LIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SIZES.MD,
    },
    avatarText: {
      fontSize: SIZES.FONT_XL,
      fontWeight: '700',
      color: colors.NURSE_PRIMARY,
    },
    userName: {
      fontSize: SIZES.FONT_XL,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    userRole: {
      fontSize: SIZES.FONT_SM,
      color: colors.NURSE_PRIMARY,
      fontWeight: '600',
      marginTop: 2,
    },
    userEmail: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_MUTED,
      marginTop: 4,
    },
    // Sections
    section: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      marginBottom: SIZES.MD,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZES.MD,
    },
    sectionTitle: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
      marginBottom: SIZES.MD,
    },
    sectionTitleInline: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
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
      color: colors.TEXT_MUTED,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
      fontWeight: '500',
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    verifiedBadgeText: {
      fontSize: SIZES.FONT_SM ?? 12,
      color: '#2E8B57',
      fontWeight: '600',
    },
    // Addresses
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.NURSE_PRIMARY,
      paddingHorizontal: SIZES.MD,
      paddingVertical: SIZES.SM,
      borderRadius: SIZES.BORDER_RADIUS_SM,
      gap: 4,
    },
    addBtnText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
    emptyAddresses: {
      alignItems: 'center',
      paddingVertical: SIZES.XL,
      gap: SIZES.SM,
    },
    emptyText: {
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
      fontWeight: '600',
    },
    emptySubtext: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_MUTED,
      textAlign: 'center',
    },
    addressCard: {
      backgroundColor: colors.BACKGROUND,
      borderRadius: SIZES.BORDER_RADIUS_SM,
      padding: SIZES.MD,
      marginBottom: SIZES.SM,
      borderWidth: 1,
      borderColor: colors.BORDER,
    },
    addressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZES.XS,
    },
    addressLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
    },
    addressLabel: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
    },
    addressLabelPrimary: {
      color: colors.NURSE_PRIMARY,
    },
    primaryBadge: {
      backgroundColor: colors.NURSE_LIGHT,
      paddingHorizontal: SIZES.SM,
      paddingVertical: 2,
      borderRadius: SIZES.BORDER_RADIUS_FULL,
    },
    primaryBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.NURSE_PRIMARY,
    },
    addressActions: {
      flexDirection: 'row',
      gap: SIZES.MD,
    },
    addressText: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
      marginBottom: 2,
    },
    addressGPS: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
    },
    // Logout
    logoutSection: {
      paddingVertical: SIZES.XL,
      alignItems: 'center',
    },
    logoutButton: {
      minWidth: 200,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.WHITE,
      borderTopLeftRadius: SIZES.BORDER_RADIUS_LG,
      borderTopRightRadius: SIZES.BORDER_RADIUS_LG,
      minHeight: '50%',
      maxHeight: '85%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SIZES.LG,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    modalTitle: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    modalScroll: {
      flex: 1,
    },
    modalScrollContent: {
      padding: SIZES.LG,
      paddingBottom: 60,
      flexGrow: 1,
    },
    inputLabel: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
      marginBottom: SIZES.XS,
      marginTop: SIZES.MD,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.WHITE,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      paddingHorizontal: SIZES.MD,
      height: SIZES.INPUT_HEIGHT,
    },
    input: {
      flex: 1,
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
      marginLeft: SIZES.SM,
      height: '100%',
    },
    gpsRow: {
      flexDirection: 'row',
      gap: SIZES.MD,
    },
    gpsItem: {
      flex: 1,
    },
    // Suggestions dropdown
    suggestionsList: {
      backgroundColor: colors.WHITE,
      borderWidth: 1,
      borderColor: colors.BORDER,
      borderRadius: SIZES.BORDER_RADIUS_SM,
      marginTop: SIZES.XS,
      overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SIZES.MD,
      paddingVertical: SIZES.SM,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
      gap: SIZES.SM,
    },
    suggestionText: {
      flex: 1,
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_PRIMARY,
    },
    suggestionsCredit: {
      padding: SIZES.SM,
      alignItems: 'center',
    },
    suggestionsCreditText: {
      fontSize: 9,
      color: colors.TEXT_MUTED,
    },
    gpsConfirm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
      marginTop: SIZES.SM,
    },
    gpsConfirmText: {
      fontSize: SIZES.FONT_XS,
      color: colors.SUCCESS,
      fontWeight: '600',
    },
    noResults: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
      marginTop: SIZES.SM,
    },
    noResultsText: {
      fontSize: SIZES.FONT_XS,
      color: colors.WARNING,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.NURSE_PRIMARY,
      height: SIZES.BUTTON_HEIGHT,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      marginTop: SIZES.XL,
      gap: SIZES.SM,
    },
    saveBtnText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
    },
    // Editing mode
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
      color: colors.TEXT_MUTED,
      fontWeight: '600',
    },
    headerSaveBtn: {
      backgroundColor: colors.NURSE_PRIMARY,
      paddingVertical: SIZES.XS,
      paddingHorizontal: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_SM,
    },
    headerSaveText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_MD,
      fontWeight: '700',
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
      color: colors.TEXT_PRIMARY,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.NURSE_PRIMARY,
      paddingVertical: SIZES.XS,
      textAlign: 'center',
    },
    editInput: {
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
      fontWeight: '500',
      borderBottomWidth: 1.5,
      borderBottomColor: colors.NURSE_PRIMARY,
      paddingVertical: SIZES.XS,
    },
  });
}

export default ProfileScreen;
