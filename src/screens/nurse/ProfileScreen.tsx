import React, { useState, useEffect } from 'react';
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
import { supabase, type NurseAddress } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import { searchAddressMapbox, type MapboxGeocodingResult } from '../../utils/mapboxGeocoding';
import { searchAddress } from '../../utils/geocoding';
import { nativeGeocode } from '../../utils/nativeGeocoding';
import LogoutButton from '../../components/LogoutButton';

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
  const [editAdeli, setEditAdeli] = useState('');
  const [editSpecialties, setEditSpecialties] = useState('');
  const [editZone, setEditZone] = useState('');

  // Re-geocoding of existing patient addresses (native geocoder: CLGeocoder / Geocoder)
  const [regeocoding, setRegeocoding] = useState(false);

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
    setEditAdeli(nurseProfile?.adeli ?? '');
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
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

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
            adeli: editAdeli.trim(),
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
        results = ban.map((b) => ({
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
      const primary = updated.find((a) => a.is_primary) ?? updated[0];

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
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse dans les suggestions pour valider le GPS.');
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
    const updated = addresses.map((a) => ({
      ...a,
      is_primary: a.id === id,
    }));
    saveAddresses(updated);
  };

  // -------------------------------------------------------------------------
  // Re-geocode this nurse's patient addresses with Mapbox (aligns stored GPS
  // with the map tiles so pins match Waze/Google). Runs client-side.
  // -------------------------------------------------------------------------

  const handleRegeocodePatients = () => {
    if (!user) return;
    Alert.alert(
      'Recalculer les GPS patients',
      'Cela va re-géocoder les adresses de vos patients avec le géocodeur natif (Apple Maps/Google Maps) pour aligner les pins sur la carte. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recalculer',
          onPress: async () => {
            setRegeocoding(true);
            try {
              // 1. patient_files for this nurse → patient ids
              const { data: files, error: fErr } = await supabase
                .from('patient_files')
                .select('patient_id')
                .eq('nurse_id', user.id);
              if (fErr) throw fErr;
              const patientIds = (files ?? []).map((f: any) => f.patient_id).filter(Boolean);
              if (patientIds.length === 0) {
                Alert.alert('Info', 'Aucun patient associé à votre compte.');
                return;
              }

              // 2. patient_profiles for those patient ids
              const { data: profiles, error: pErr } = await supabase
                .from('patient_profiles')
                .select('profile_id, address, gps_lat, gps_lng')
                .in('profile_id', patientIds);
              if (pErr) throw pErr;

              const withAddr = (profiles ?? []).filter(
                (p: any) => (p.address ?? '').trim().length > 0,
              );

              let updated = 0;
              let failed = 0;
              for (const p of withAddr) {
                const coord = await nativeGeocode(p.address);
                if (!coord) { failed++; continue; }
                const moved =
                  p.gps_lat == null ||
                  p.gps_lng == null ||
                  Math.abs(p.gps_lat - coord.lat) > 1e-6 ||
                  Math.abs(p.gps_lng - coord.lng) > 1e-6;
                if (!moved) continue;
                const { error: upErr } = await supabase
                  .from('patient_profiles')
                  .update({ gps_lat: coord.lat, gps_lng: coord.lng })
                  .eq('profile_id', p.profile_id);
                if (upErr) { failed++; continue; }
                updated++;
              }

              Alert.alert(
                'Terminé',
                `${updated} adresse(s) recalculée(s) avec le géocodeur natif.${failed > 0 ? `\n${failed} échec(s).` : ''}`,
              );
            } catch (err: any) {
              Alert.alert('Erreur', err?.message ?? 'Échec du re-géocodage.');
            } finally {
              setRegeocoding(false);
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Delete address
  // -------------------------------------------------------------------------

  const handleDelete = (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;

    Alert.alert(
      'Supprimer l\'adresse',
      `Supprimer "${addr.label}" — ${addr.address} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updated = addresses.filter((a) => a.id !== id);
            // If we deleted the primary, make the first remaining one primary
            if (addr.is_primary && updated.length > 0) {
              updated[0].is_primary = true;
            }
            saveAddresses(updated);
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const getRoleLabel = () => {
    switch (userProfile?.user_type) {
      case 'nurse': return 'Infirmière libérale';
      case 'family': return 'Famille';
      default: return 'Patient';
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
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.headerSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="create-outline" size={20} color={COLORS.NURSE_PRIMARY} />
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(isEditing ? editFirstName : userProfile?.first_name)?.[0]}
              {(isEditing ? editLastName : userProfile?.last_name)?.[0]}
            </Text>
          </View>
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
          <Text style={styles.userRole}>{getRoleLabel()}</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Professional info */}
        {userProfile?.user_type === 'nurse' && nurseProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations professionnelles</Text>

            <View style={styles.infoRow}>
              <Ionicons name="id-card-outline" size={20} color={COLORS.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>N° ADELI</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editAdeli}
                    onChangeText={setEditAdeli}
                    placeholder="N° ADELI"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                  />
                ) : (
                  <Text style={styles.infoValue}>{nurseProfile.adeli || 'Non renseigné'}</Text>
                )}
              </View>
            </View>

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
                  <Text style={styles.infoValue}>{userProfile.phone || 'Non renseigné'}</Text>
                )}
              </View>
            </View>

            {(isEditing || (nurseProfile.specialties && nurseProfile.specialties.length > 0)) && (
              <View style={styles.infoRow}>
                <Ionicons name="medical-outline" size={20} color={COLORS.TEXT_MUTED} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Spécialités</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editSpecialties}
                      onChangeText={setEditSpecialties}
                      placeholder="Soins généraux, Injections..."
                      placeholderTextColor={COLORS.TEXT_MUTED}
                    />
                  ) : (
                    <Text style={styles.infoValue}>{nurseProfile.specialties?.join(', ')}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color={COLORS.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Zone d'intervention</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editZone}
                    onChangeText={setEditZone}
                    placeholder="Zone d'intervention"
                    placeholderTextColor={COLORS.TEXT_MUTED}
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
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={18} color={COLORS.WHITE} />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.regeocodeBtn}
              onPress={handleRegeocodePatients}
              disabled={regeocoding}
            >
              {regeocoding ? (
                <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} />
              ) : (
                <Ionicons name="locate-outline" size={16} color={COLORS.NURSE_PRIMARY} />
              )}
              <Text style={styles.regeocodeBtnText}>
                {regeocoding ? 'Recalcul en cours…' : 'Recalculer les GPS patients (natif)'}
              </Text>
            </TouchableOpacity>

            {addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <Ionicons name="location-outline" size={32} color={COLORS.BORDER} />
                <Text style={styles.emptyText}>Aucune adresse enregistrée</Text>
                <Text style={styles.emptySubtext}>
                  Ajoutez votre cabinet, domicile, ou autres lieux de passage.
                </Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <View style={styles.addressLabelRow}>
                      <Ionicons
                        name={addr.is_primary ? 'star' : 'location-outline'}
                        size={16}
                        color={addr.is_primary ? COLORS.NURSE_PRIMARY : COLORS.TEXT_MUTED}
                      />
                      <Text style={[
                        styles.addressLabel,
                        addr.is_primary && styles.addressLabelPrimary,
                      ]}>
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
                          <Ionicons name="star-outline" size={18} color={COLORS.TEXT_MUTED} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(addr.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.DANGER} />
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

        {/* Stats */}
        {userProfile?.user_type === 'nurse' && nurseProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.total_patients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.total_visits}</Text>
                <Text style={styles.statLabel}>Visites</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{nurseProfile.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>
            </View>
          </View>
        )}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <LogoutButton variant="danger" style={styles.logoutButton} />
        </View>
      </ScrollView>

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
                  <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
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
                  <Ionicons name="bookmark-outline" size={20} color={COLORS.TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Cabinet, Domicile, Résidence..."
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={newLabel}
                    onChangeText={setNewLabel}
                  />
                </View>

                <Text style={styles.inputLabel}>Adresse *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="search-outline" size={20} color={COLORS.TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Chercher une adresse..."
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={searchQuery}
                    onChangeText={(t) => {
                      setSearchQuery(t);
                      setSelectedGPS(null);
                      setNewAddress(t);
                    }}
                    multiline
                  />
                  {searching && (
                    <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} />
                  )}
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
                        <Ionicons name="location-outline" size={16} color={COLORS.NURSE_PRIMARY} />
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
                    <Ionicons name="alert-circle-outline" size={16} color={COLORS.WARNING} />
                    <Text style={styles.noResultsText}>
                      Aucune adresse trouvée. Essayez un autre mot-clé.
                    </Text>
                  </View>
                )}

                {/* GPS confirmation */}
                {selectedGPS && (
                  <View style={styles.gpsConfirm}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
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
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.WHITE} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.MD,
  },
  avatarText: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  userName: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  userRole: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
    marginTop: 2,
  },
  userEmail: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.MD,
  },
  sectionTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SIZES.MD,
  },
  sectionTitleInline: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
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
  // Addresses
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 4,
  },
  addBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
  regeocodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.SM,
    marginTop: SIZES.SM,
    marginBottom: SIZES.XS,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    borderWidth: 1,
    borderColor: COLORS.NURSE_PRIMARY,
    backgroundColor: COLORS.WHITE,
    gap: SIZES.XS,
  },
  regeocodeBtnText: {
    color: COLORS.NURSE_PRIMARY,
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
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.MD,
    marginBottom: SIZES.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    color: COLORS.TEXT_PRIMARY,
  },
  addressLabelPrimary: {
    color: COLORS.NURSE_PRIMARY,
  },
  primaryBadge: {
    backgroundColor: COLORS.NURSE_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  addressActions: {
    flexDirection: 'row',
    gap: SIZES.MD,
  },
  addressText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  addressGPS: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  statLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
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
    backgroundColor: COLORS.WHITE,
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
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
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
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.XS,
    marginTop: SIZES.MD,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    paddingHorizontal: SIZES.MD,
    height: SIZES.INPUT_HEIGHT,
  },
  input: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
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
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    borderBottomColor: COLORS.BORDER,
    gap: SIZES.SM,
  },
  suggestionText: {
    flex: 1,
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_PRIMARY,
  },
  suggestionsCredit: {
    padding: SIZES.SM,
    alignItems: 'center',
  },
  suggestionsCreditText: {
    fontSize: 9,
    color: COLORS.TEXT_MUTED,
  },
  gpsConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.XS,
    marginTop: SIZES.SM,
  },
  gpsConfirmText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.SUCCESS,
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
    color: COLORS.WARNING,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    height: SIZES.BUTTON_HEIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.XL,
    gap: SIZES.SM,
  },
  saveBtnText: {
    color: COLORS.WHITE,
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
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  headerSaveBtn: {
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.XS,
    paddingHorizontal: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_SM,
  },
  headerSaveText: {
    color: COLORS.WHITE,
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
    color: COLORS.TEXT_PRIMARY,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.XS,
    textAlign: 'center',
  },
  editInput: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.XS,
  },
});

export default ProfileScreen;
