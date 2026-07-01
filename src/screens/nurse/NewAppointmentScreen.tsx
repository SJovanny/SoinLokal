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
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES, CARE_TYPES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientOption {
  patient_file_id: string;
  patient_id: string;
  name: string;
  address: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeFR(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function timeToISO(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

function parseManualDate(text: string): Date | null {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(+yyyy, +mm - 1, +dd);
  if (d.getFullYear() !== +yyyy || d.getMonth() !== +mm - 1 || d.getDate() !== +dd) return null;
  return d;
}

function parseManualTime(text: string): { h: number; m: number } | null {
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, hh, mm] = match;
  if (+hh >= 24 || +mm >= 60) return null;
  return { h: +hh, m: +mm };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NewAppointmentScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();

  const preselectedPatientId: string | null = route.params?.patientId ?? null;
  const preselectedFileId: string | null = route.params?.patientFileId ?? null;

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [dateObj, setDateObj] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [timeObj, setTimeObj] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [careType, setCareType] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateEditMode, setDateEditMode] = useState(false);
  const [timeEditMode, setTimeEditMode] = useState(false);
  const [dateManual, setDateManual] = useState('');
  const [timeManual, setTimeManual] = useState('');

  // Data
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showCareTypeModal, setShowCareTypeModal] = useState(false);

  // -------------------------------------------------------------------------
  // Load nurse's patients
  // -------------------------------------------------------------------------

  useEffect(() => {
    const loadPatients = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: files, error } = await supabase
          .from('patient_files')
          .select('id, patient_id')
          .eq('nurse_id', user.id)
          .eq('is_active', true);

        if (error) {
          console.error('[NewAppointment] load files error:', error.message);
          return;
        }

        const ids = (files ?? []).map((f: any) => f.patient_id);
        if (ids.length === 0) {
          setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', ids);

        const { data: pps } = await supabase
          .from('patient_profiles')
          .select('profile_id, address')
          .in('profile_id', ids);

        const profileMap: Record<string, any> = {};
        (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

        const ppMap: Record<string, any> = {};
        (pps ?? []).forEach((pp: any) => { ppMap[pp.profile_id] = pp; });

        const options: PatientOption[] = (files ?? []).map((f: any) => {
          const p = profileMap[f.patient_id];
          const pp = ppMap[f.patient_id];
          return {
            patient_file_id: f.id,
            patient_id: f.patient_id,
            name: p ? `${p.first_name} ${p.last_name}` : 'Patient inconnu',
            address: pp?.address ?? null,
          };
        });

        setPatients(options);

        if (preselectedFileId) {
          const found = options.find((o) => o.patient_file_id === preselectedFileId);
          if (found) {
            setSelectedPatient(found);
            if (found.address) setAddress(found.address);
          }
        } else if (preselectedPatientId) {
          const found = options.find((o) => o.patient_id === preselectedPatientId);
          if (found) {
            setSelectedPatient(found);
            if (found.address) setAddress(found.address);
          }
        }
      } catch (err) {
        console.error('[NewAppointment] unexpected:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [user]);

  // -------------------------------------------------------------------------
  // Date picker handlers
  // -------------------------------------------------------------------------

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      selectedDate.setHours(0, 0, 0, 0);
      setDateObj(selectedDate);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) {
      const newTime = new Date(timeObj);
      newTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setTimeObj(newTime);
    }
  };

  const handleDateManualSubmit = () => {
    const parsed = parseManualDate(dateManual);
    if (parsed) {
      setDateObj(parsed);
      setDateEditMode(false);
    } else {
      Alert.alert('Erreur', 'Date invalide. Format attendu : JJ/MM/AAAA');
    }
  };

  const handleTimeManualSubmit = () => {
    const parsed = parseManualTime(timeManual);
    if (parsed) {
      const newTime = new Date(timeObj);
      newTime.setHours(parsed.h, parsed.m);
      setTimeObj(newTime);
      setTimeEditMode(false);
    } else {
      Alert.alert('Erreur', 'Heure invalide. Format attendu : HH:MM');
    }
  };

  // -------------------------------------------------------------------------
  // Select patient
  // -------------------------------------------------------------------------

  const handleSelectPatient = (patient: PatientOption) => {
    setSelectedPatient(patient);
    setAddress(patient.address ?? '');
    setShowPatientModal(false);
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un patient.');
      return;
    }
    if (!careType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de soin.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_file_id: selectedPatient.patient_file_id,
        nurse_id: user!.id,
        date: dateToISO(dateObj),
        time: timeToISO(timeObj),
        care_type: careType,
        address: address || null,
        notes: notes || null,
        status: 'pending',
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      Alert.alert('Succès', 'Le rendez-vous a été créé.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau rendez-vous</Text>
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
          {/* Patient */}
          <Text style={styles.label}>Patient *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowPatientModal(true)}
          >
            <Ionicons name="person-outline" size={20} color={COLORS.TEXT_MUTED} />
            <Text
              style={[
                styles.selectText,
                !selectedPatient && styles.placeholder,
              ]}
            >
              {selectedPatient?.name ?? 'Sélectionner un patient'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>

          {/* Date */}
          <Text style={styles.label}>Date *</Text>
          {dateEditMode ? (
            <View style={styles.inputWrap}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={dateManual}
                onChangeText={setDateManual}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                onBlur={handleDateManualSubmit}
                onSubmitEditing={handleDateManualSubmit}
              />
              <TouchableOpacity
                onPress={() => setDateEditMode(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.NURSE_PRIMARY} />
              <Text style={styles.selectText}>{formatDateFR(dateObj)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setDateManual(
                    `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
                  );
                  setDateEditMode(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Time */}
          <Text style={styles.label}>Heure *</Text>
          {timeEditMode ? (
            <View style={styles.inputWrap}>
              <Ionicons name="time-outline" size={20} color={COLORS.TEXT_MUTED} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={timeManual}
                onChangeText={setTimeManual}
                keyboardType="number-pad"
                maxLength={5}
                autoFocus
                onBlur={handleTimeManualSubmit}
                onSubmitEditing={handleTimeManualSubmit}
              />
              <TouchableOpacity
                onPress={() => setTimeEditMode(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.NURSE_PRIMARY} />
              <Text style={styles.selectText}>{formatTimeFR(timeObj)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setTimeManual(
                    `${String(timeObj.getHours()).padStart(2, '0')}:${String(timeObj.getMinutes()).padStart(2, '0')}`
                  );
                  setTimeEditMode(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Care type */}
          <Text style={styles.label}>Type de soin *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowCareTypeModal(true)}
          >
            <Ionicons name="medkit-outline" size={20} color={COLORS.TEXT_MUTED} />
            <Text
              style={[
                styles.selectText,
                !careType && styles.placeholder,
              ]}
            >
              {careType || 'Sélectionner un type de soin'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>

          {/* Address */}
          <Text style={styles.label}>Adresse</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={20} color={COLORS.TEXT_MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Adresse du patient"
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes additionnelles..."
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.WHITE} />
                <Text style={styles.submitText}>Enregistrer le rendez-vous</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Native Date Picker (iOS inline, Android dialog) */}
      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Native Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={timeObj}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          is24Hour
        />
      )}

      {/* Patient Modal */}
      <Modal visible={showPatientModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un patient</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            {patients.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={40} color={COLORS.BORDER} />
                <Text style={styles.modalEmptyText}>
                  Aucun patient. Ajoutez un patient depuis l'onglet Patients.
                </Text>
              </View>
            ) : (
              <FlatList
                data={patients}
                keyExtractor={(item) => item.patient_file_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedPatient?.patient_file_id === item.patient_file_id &&
                        styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectPatient(item)}
                  >
                    <Ionicons name="person" size={20} color={COLORS.NURSE_PRIMARY} />
                    <View style={{ flex: 1, marginLeft: SIZES.SM }}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      {item.address ? (
                        <Text style={styles.modalItemSub} numberOfLines={1}>
                          {item.address}
                        </Text>
                      ) : null}
                    </View>
                    {selectedPatient?.patient_file_id === item.patient_file_id && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Care Type Modal */}
      <Modal visible={showCareTypeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Type de soin</Text>
              <TouchableOpacity onPress={() => setShowCareTypeModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CARE_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    careType === item && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setCareType(item);
                    setShowCareTypeModal(false);
                  }}
                >
                  <Ionicons name="medkit" size={20} color={COLORS.NURSE_PRIMARY} />
                  <Text style={[styles.modalItemName, { marginLeft: SIZES.SM, flex: 1 }]}>
                    {item}
                  </Text>
                  {careType === item && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
                  )}
                </TouchableOpacity>
              )}
            />
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
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header
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
  backBtn: {
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
  // Form
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  label: {
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
  textAreaWrap: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: SIZES.MD,
  },
  textArea: {
    height: '100%',
    marginLeft: 0,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    paddingHorizontal: SIZES.MD,
    height: SIZES.INPUT_HEIGHT,
  },
  selectText: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SIZES.SM,
  },
  placeholder: {
    color: COLORS.TEXT_MUTED,
  },
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    height: SIZES.BUTTON_HEIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.XL,
    gap: SIZES.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
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
    maxHeight: '70%',
    paddingBottom: 20,
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
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalItemSelected: {
    backgroundColor: COLORS.NURSE_LIGHT,
  },
  modalItemName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  modalItemSub: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  modalEmpty: {
    alignItems: 'center',
    padding: 40,
    gap: SIZES.MD,
  },
  modalEmptyText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
});

export default NewAppointmentScreen;
