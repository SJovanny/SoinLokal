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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import { searchAddressMapbox, type MapboxGeocodingResult } from '../../utils/mapboxGeocoding';
import { nativeGeocode } from '../../utils/nativeGeocoding';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AddManagedPatient: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, fetchProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [allergies, setAllergies] = useState('');

  const [selectedGPS, setSelectedGPS] = useState<{ lat: number; lng: number } | null>(null);

  // Address search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxGeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [saving, setSaving] = useState(false);

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
      const results = await searchAddressMapbox(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // -------------------------------------------------------------------------
  // Select address suggestion
  // -------------------------------------------------------------------------

  const handleSelectSuggestion = async (s: MapboxGeocodingResult) => {
    setAddress(s.address);
    setSearchQuery(s.address);
    setShowSuggestions(false);

    // Use native geocoder for precise GPS alignment
    const native = await nativeGeocode(s.address);
    if (native) {
      setSelectedGPS({ lat: native.lat, lng: native.lng });
    } else {
      setSelectedGPS({ lat: s.lat, lng: s.lng });
    }
  };

  // -------------------------------------------------------------------------
  // Validate
  // -------------------------------------------------------------------------

  const validate = (): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Erreur', "L'adresse est obligatoire");
      return false;
    }
    if (!selectedGPS) {
      Alert.alert('Erreur', "Sélectionnez une adresse dans les suggestions pour valider le GPS");
      return false;
    }
    // DOB validation (optional but if filled, must be valid format)
    if (dob.trim()) {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) {
        Alert.alert('Erreur', 'Format de date invalide (AAAA-MM-JJ)');
        return false;
      }
    }
    return true;
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validate() || !user) return;

    setSaving(true);
    try {
      const allergiesArray = allergies
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob: dob.trim() || undefined,
        address: address.trim(),
        address_label: addressLabel.trim() || undefined,
        gps_lat: selectedGPS!.lat,
        gps_lng: selectedGPS!.lng,
        access_code: accessCode.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        medical_notes: medicalNotes.trim() || undefined,
        allergies: allergiesArray.length > 0 ? allergiesArray : undefined,
      };

      const { data, error } = await supabase.functions.invoke('create-managed-patient', {
        body: payload,
      });

      if (error) {
        Alert.alert('Erreur', error.message ?? "Erreur lors de la création du patient");
        return;
      }

      if (data?.error) {
        Alert.alert('Erreur', data.error);
        return;
      }

      // Refresh family links in AuthContext
      await fetchProfile(user.id);

      Alert.alert(
        'Patient créé',
        `${data?.patient_name ?? 'Le patient'} a été créé avec succès.\n\nCe patient apparaîtra dans la liste des infirmières qui pourront l'ajouter à leur liste de suivi.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur inattendue est survenue');
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter un proche</Text>
        <View style={{ width: 40 }} />
      </View>

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
          {/* Identity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identité</Text>

            <Text style={styles.inputLabel}>Prénom *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Prénom du patient"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={firstName}
                onChangeText={setFirstName}
                autoCorrect={false}
              />
            </View>

            <Text style={styles.inputLabel}>Nom *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Nom du patient"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={lastName}
                onChangeText={setLastName}
                autoCorrect={false}
              />
            </View>

            <Text style={styles.inputLabel}>Date de naissance</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={dob}
                onChangeText={setDob}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>

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
                  setAddress(t);
                }}
                multiline
              />
              {searching && <ActivityIndicator size="small" color={COLORS.FAMILY_PRIMARY} />}
            </View>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(s)}
                  >
                    <Ionicons name="location-outline" size={16} color={COLORS.FAMILY_PRIMARY} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {s.address}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.suggestionsCredit}>
                  <Text style={styles.suggestionsCreditText}>Données © Mapbox · OpenStreetMap</Text>
                </View>
              </View>
            )}

            {/* No results */}
            {!searching && searchQuery.trim().length >= 3 && suggestions.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.WARNING} />
                <Text style={styles.noResultsText}>Aucune adresse trouvée</Text>
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

            <Text style={styles.inputLabel}>Repère / Libellé</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="bookmark-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Ex: appartement 3B, interphone Borgia"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={addressLabel}
                onChangeText={setAddressLabel}
              />
            </View>

            <Text style={styles.inputLabel}>Code d'accès / Digicode</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Ex: A1234 ou interphone 3B"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={accessCode}
                onChangeText={setAccessCode}
              />
            </View>
          </View>

          {/* Medical */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations médicales</Text>

            <Text style={styles.inputLabel}>Notes médicales</Text>
            <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.TEXT_MUTED} style={{ marginTop: 12 }} />
              <TextInput
                style={[styles.input, { textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Diabète, hypertension, suivi régulier..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={medicalNotes}
                onChangeText={setMedicalNotes}
                multiline
              />
            </View>

            <Text style={styles.inputLabel}>Allergies (séparées par des virgules)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="warning-outline" size={20} color={COLORS.WARNING} />
              <TextInput
                style={styles.input}
                placeholder="Pénicilline, Aspirine..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={allergies}
                onChangeText={setAllergies}
              />
            </View>

            <Text style={styles.inputLabel}>Contact d'urgence</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Numéro de téléphone"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color={COLORS.WHITE} />
                <Text style={styles.submitBtnText}>Créer le dossier patient</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.FAMILY_PRIMARY} />
            <Text style={styles.infoBoxText}>
              Ce patient sera créé en votre nom et apparaîtra dans la liste des infirmières. Elles pourront l'ajouter à leur liste de suivi et gérer ses rendez-vous.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Section
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
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.MD,
    paddingBottom: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  // Input
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
  // Suggestions
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
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.FAMILY_PRIMARY,
    height: SIZES.BUTTON_HEIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.MD,
    gap: SIZES.SM,
  },
  submitBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
  },
  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.SM,
    backgroundColor: COLORS.FAMILY_LIGHT,
    padding: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.MD,
  },
  infoBoxText: {
    flex: 1,
    fontSize: SIZES.FONT_SM,
    color: COLORS.FAMILY_DARK,
    lineHeight: 20,
  },
});

export default AddManagedPatient;
