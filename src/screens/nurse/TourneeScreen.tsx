import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES, CARE_TYPES } from '../../utils/constants';
import {
  type GPSPoint,
  type FlexibleTourStop,
  type FlexibleTourResult,
  flexibleTour,
} from '../../utils/routing';
import { STRASBOURG_CENTER } from '../../utils/mapbox';
import { openNavigation } from '../../utils/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourAppointment {
  id: string;
  patient_file_id: string;
  nurse_id: string;
  date: string;
  time: string | null;
  care_type: string;
  duration_min: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  address: string | null;
  notes: string | null;
  completion_note: string | null;
  patient_name: string;
  patient_phone: string | null;
  gps: GPSPoint | null;
  address_label: string | null;
}

interface PatientOption {
  patient_file_id: string;
  patient_id: string;
  name: string;
  address: string | null;
  gps: GPSPoint | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  pending:   { color: COLORS.WARNING, label: 'En attente',   icon: 'time-outline' },
  confirmed: { color: COLORS.NURSE_PRIMARY, label: 'Confirmé', icon: 'checkmark-circle-outline' },
  completed: { color: COLORS.SUCCESS, label: 'Terminé',       icon: 'checkmark-circle' },
  cancelled: { color: COLORS.DANGER,  label: 'Annulé',        icon: 'close-circle-outline' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time.substring(0, 5);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Date Strip Component
// ---------------------------------------------------------------------------

function DateStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const today = getTodayISO();
  const days: string[] = [];
  for (let i = -2; i <= 5; i++) {
    days.push(addDays(today, i));
  }

  return (
    <View style={styles.dateStrip}>
      <TouchableOpacity
        onPress={() => onSelect(addDays(selectedDate, -1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={COLORS.NURSE_PRIMARY} />
      </TouchableOpacity>
      {days.map((day) => {
        const isSelected = day === selectedDate;
        const isToday = day === today;
        const d = new Date(day + 'T12:00:00');
        const dayNum = d.getDate();
        const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'short' });

        return (
          <TouchableOpacity
            key={day}
            style={[
              styles.dateChip,
              isSelected && styles.dateChipSelected,
              isToday && !isSelected && styles.dateChipToday,
            ]}
            onPress={() => onSelect(day)}
          >
            <Text
              style={[
                styles.dateChipDay,
                isSelected && styles.dateChipDaySelected,
              ]}
            >
              {dayLabel}
            </Text>
            <Text
              style={[
                styles.dateChipNum,
                isSelected && styles.dateChipNumSelected,
              ]}
            >
              {dayNum}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        onPress={() => onSelect(addDays(selectedDate, 1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-forward" size={20} color={COLORS.NURSE_PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Patient Modal
// ---------------------------------------------------------------------------

function AddPatientModal({
  visible,
  onClose,
  onAdd,
  existingFileIds,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (patient: PatientOption, careType: string, durationMin: number, time: string | null) => void;
  existingFileIds: string[];
}) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [careType, setCareType] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [time, setTime] = useState('');
  const [showCareTypeDropdown, setShowCareTypeDropdown] = useState(false);
  const [customCareTypes, setCustomCareTypes] = useState<string[]>([]);
  const [newCareTypeInput, setNewCareTypeInput] = useState('');

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    setSelectedPatient(null);
    setCareType('');
    setDurationMin(30);
    setTime('');
    setNewCareTypeInput('');

    const loadData = async () => {
      const [filesResult, customTypesResult] = await Promise.all([
        supabase
          .from('patient_files')
          .select('id, patient_id')
          .eq('nurse_id', user.id)
          .eq('is_active', true),
        supabase
          .from('nurse_care_types')
          .select('name')
          .eq('nurse_id', user.id),
      ]);

      setCustomCareTypes((customTypesResult.data ?? []).map((t: any) => t.name));

      const files = filesResult.data;
      if (!files || files.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const ids = files.map((f: any) => f.patient_id);

      const [profilesRes, ppsRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, phone').in('id', ids),
        supabase.from('patient_profiles').select('profile_id, address, gps_lat, gps_lng').in('profile_id', ids),
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p; });

      const ppMap: Record<string, any> = {};
      (ppsRes.data ?? []).forEach((pp: any) => { ppMap[pp.profile_id] = pp; });

      const options: PatientOption[] = files
        .filter((f: any) => !existingFileIds.includes(f.id))
        .map((f: any) => {
          const p = profileMap[f.patient_id];
          const pp = ppMap[f.patient_id];
          return {
            patient_file_id: f.id,
            patient_id: f.patient_id,
            name: p ? `${p.first_name} ${p.last_name}` : 'Patient inconnu',
            address: pp?.address ?? null,
            gps: pp?.gps_lat != null && pp?.gps_lng != null
              ? { lat: pp.gps_lat, lng: pp.gps_lng }
              : null,
          };
        });

      setPatients(options);
      setLoading(false);
    };

    loadData();
  }, [visible, user, existingFileIds]);

  const addCustomCareType = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || customCareTypes.includes(trimmed) || CARE_TYPES.includes(trimmed) || !user) return;

    setCustomCareTypes((prev) => [...prev, trimmed]);
    setCareType(trimmed);
    setNewCareTypeInput('');
    setShowCareTypeDropdown(false);

    await supabase.from('nurse_care_types').insert({
      nurse_id: user.id,
      name: trimmed,
    });
  };

  const handleAdd = () => {
    if (!selectedPatient) {
      Alert.alert('Erreur', 'Sélectionnez un patient.');
      return;
    }
    if (!careType) {
      Alert.alert('Erreur', 'Sélectionnez un type de soin.');
      return;
    }
    onAdd(selectedPatient, careType, durationMin, time || null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un patient</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {!selectedPatient ? (
                <>
                  {/* Step 1 — Patient list */}
                  <Text style={styles.modalSectionTitle}>
                    {patients.length === 0 ? 'Aucun patient disponible' : 'Choisir un patient'}
                  </Text>

                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} style={{ padding: 20 }} />
                  ) : patients.length === 0 ? (
                    <Text style={styles.modalEmptyText}>
                      Tous vos patients sont déjà dans la tournée.
                    </Text>
                  ) : (
                    patients.map((item) => (
                      <TouchableOpacity
                        key={item.patient_file_id}
                        style={[styles.modalItem]}
                        onPress={() => setSelectedPatient(item)}
                      >
                        <Ionicons name="person" size={20} color={COLORS.NURSE_PRIMARY} />
                        <View style={{ flex: 1, marginLeft: SIZES.SM }}>
                          <Text style={styles.modalItemName}>{item.name}</Text>
                          {item.address ? (
                            <Text style={styles.modalItemSub} numberOfLines={1}>{item.address}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.TEXT_MUTED} />
                      </TouchableOpacity>
                    ))
                  )}
                </>
              ) : (
                <>
                  {/* Step 2 — Form */}
                  <View style={styles.selectedPatientRow}>
                    <Ionicons name="person" size={20} color={COLORS.NURSE_PRIMARY} />
                    <Text style={styles.selectedPatientName} numberOfLines={1}>{selectedPatient.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                      <Text style={styles.changeBtn}>Changer</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.addForm}>
                    <Text style={styles.formLabel}>Type de soin *</Text>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      onPress={() => setShowCareTypeDropdown(!showCareTypeDropdown)}
                    >
                      <Ionicons name="medkit-outline" size={18} color={COLORS.TEXT_MUTED} />
                      <Text style={[styles.selectText, !careType && styles.placeholder]}>
                        {careType || 'Sélectionner'}
                      </Text>
                      <Ionicons name={showCareTypeDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.TEXT_MUTED} />
                    </TouchableOpacity>

                    {showCareTypeDropdown && (
                      <View style={styles.careTypeDropdown}>
                        <View style={styles.careTypeInputRow}>
                          <TextInput
                            style={styles.careTypeInput}
                            placeholder="Nouveau soin..."
                            placeholderTextColor={COLORS.TEXT_MUTED}
                            value={newCareTypeInput}
                            onChangeText={setNewCareTypeInput}
                            onSubmitEditing={() => addCustomCareType(newCareTypeInput)}
                            returnKeyType="done"
                          />
                          <TouchableOpacity
                            style={styles.careTypeAddBtn}
                            onPress={() => addCustomCareType(newCareTypeInput)}
                          >
                            <Ionicons name="add" size={20} color={COLORS.WHITE} />
                          </TouchableOpacity>
                        </View>
                        {[...customCareTypes, ...CARE_TYPES].map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.modalItem, careType === item && styles.modalItemSelected]}
                            onPress={() => {
                              setCareType(item);
                              setShowCareTypeDropdown(false);
                            }}
                          >
                            <Ionicons name="medkit" size={18} color={COLORS.NURSE_PRIMARY} />
                            <Text style={[styles.modalItemName, { marginLeft: SIZES.SM, flex: 1 }]}>{item}</Text>
                            {careType === item && (
                              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text style={styles.formLabel}>Durée</Text>
                    <View style={styles.durationRow}>
                      {[15, 30, 45, 60, 90].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.durationChip, durationMin === d && styles.durationChipSelected]}
                          onPress={() => setDurationMin(d)}
                        >
                          <Text
                            style={[
                              styles.durationChipText,
                              durationMin === d && styles.durationChipTextSelected,
                            ]}
                          >
                            {d < 60 ? `${d}min` : `${d / 60}h`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.formLabel}>Heure (optionnel)</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="time-outline" size={18} color={COLORS.TEXT_MUTED} />
                      <TextInput
                        style={styles.input}
                        placeholder="HH:MM"
                        placeholderTextColor={COLORS.TEXT_MUTED}
                        value={time}
                        onChangeText={setTime}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>

                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                      <Ionicons name="add-circle" size={20} color={COLORS.WHITE} />
                      <Text style={styles.addBtnText}>Ajouter à la tournée</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TourneeScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [appointments, setAppointments] = useState<TourAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tourResult, setTourResult] = useState<FlexibleTourResult | null>(null);
  const [tourLoading, setTourLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [departureTime, setDepartureTime] = useState(getCurrentTimeHHMM());
  const [editingDeparture, setEditingDeparture] = useState(false);
  const [departureInput, setDepartureInput] = useState('');

  // Open add modal from navigation params
  useEffect(() => {
    if (route.params?.openAddModal) {
      setShowAddModal(true);
      navigation.setParams({ openAddModal: false });
    }
  }, [route.params?.openAddModal]);

  // -------------------------------------------------------------------------
  // Fetch appointments for selected date
  // -------------------------------------------------------------------------

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, patient_file_id, nurse_id, date, time, care_type, duration_min,
          status, address, notes, completion_note,
          patient_file:patient_files!patient_file_id(
            id, patient_id,
            patient:profiles!patient_id(id, first_name, last_name, phone)
          )
        `)
        .eq('nurse_id', user.id)
        .eq('date', selectedDate)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Tournee] fetch error:', error.message);
        return;
      }

      // Collect patient_ids and fetch patient_profiles separately
      const patientIds = (data ?? [])
        .map((row: any) => row.patient_file?.patient_id)
        .filter(Boolean);

      let patientProfilesMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('patient_profiles')
          .select('profile_id, address, address_label, gps_lat, gps_lng')
          .in('profile_id', patientIds);

        (profiles ?? []).forEach((pp: any) => {
          patientProfilesMap[pp.profile_id] = pp;
        });
      }

      // Merge
      const mapped: TourAppointment[] = (data ?? []).map((row: any) => {
        const patient = Array.isArray(row.patient_file?.patient)
          ? row.patient_file.patient[0] ?? null
          : row.patient_file?.patient ?? null;
        const patientId = row.patient_file?.patient_id;
        const pp = patientId ? patientProfilesMap[patientId] ?? null : null;

        return {
          id: row.id,
          patient_file_id: row.patient_file_id,
          nurse_id: row.nurse_id,
          date: row.date,
          time: row.time,
          care_type: row.care_type,
          duration_min: row.duration_min,
          status: row.status,
          address: row.address,
          notes: row.notes,
          completion_note: row.completion_note,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Patient inconnu',
          patient_phone: patient?.phone ?? null,
          gps: pp?.gps_lat != null && pp?.gps_lng != null
            ? { lat: pp.gps_lat, lng: pp.gps_lng }
            : null,
          address_label: pp?.address ?? row.address ?? null,
        };
      });

      setAppointments(mapped);
    } catch (err) {
      console.error('[Tournee] unexpected:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // -------------------------------------------------------------------------
  // Calculate tour when appointments or departure time change
  // -------------------------------------------------------------------------

  useEffect(() => {
    const calculateTour = async () => {
      const withGPS = appointments.filter((a) => a.gps);
      if (withGPS.length === 0) {
        setTourResult(null);
        return;
      }

      setTourLoading(true);
      try {
        // Get nurse GPS
        let nurseGPS: GPSPoint | null = null;

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            nurseGPS = { lat: position.coords.latitude, lng: position.coords.longitude };
          }
        } catch {}

        if (!nurseGPS) {
          const { data: nurseProfile } = await supabase
            .from('nurse_profiles')
            .select('addresses, gps_lat, gps_lng')
            .eq('profile_id', user!.id)
            .single();

          if (nurseProfile?.addresses && nurseProfile.addresses.length > 0) {
            const primary = nurseProfile.addresses.find((a: any) => a.is_primary) ?? nurseProfile.addresses[0];
            if (primary.gps_lat && primary.gps_lng) {
              nurseGPS = { lat: primary.gps_lat, lng: primary.gps_lng };
            }
          } else if (nurseProfile?.gps_lat != null && nurseProfile?.gps_lng != null) {
            nurseGPS = { lat: nurseProfile.gps_lat, lng: nurseProfile.gps_lng };
          }
        }

        if (!nurseGPS) {
          setTourResult(null);
          setTourLoading(false);
          return;
        }

        const stops: FlexibleTourStop[] = withGPS.map((a) => ({
          gps: a.gps!,
          careType: a.care_type,
          durationMin: a.duration_min,
          patientFileId: a.patient_file_id,
          time: a.time,
        }));

        const result = await flexibleTour(nurseGPS, stops, departureTime);
        setTourResult(result);
      } catch (err) {
        console.error('[Tournee] tour calculation error:', err);
      } finally {
        setTourLoading(false);
      }
    };

    if (!loading && appointments.length > 0) {
      calculateTour();
    } else {
      setTourResult(null);
    }
  }, [appointments, departureTime, loading]);

  // -------------------------------------------------------------------------
  // Add patient to tour
  // -------------------------------------------------------------------------

  const handleAddPatient = async (
    patient: PatientOption,
    careType: string,
    durationMin: number,
    time: string | null,
  ) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_file_id: patient.patient_file_id,
        nurse_id: user.id,
        date: selectedDate,
        time: time,
        care_type: careType,
        duration_min: durationMin,
        status: 'pending',
        address: patient.address || null,
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      await fetchAppointments();
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    }
  };

  // -------------------------------------------------------------------------
  // Remove patient from tour
  // -------------------------------------------------------------------------

  const handleRemove = async (appointmentId: string, patientName: string) => {
    Alert.alert(
      'Retirer de la tournée',
      `Retirer ${patientName} de la tournée ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .delete()
              .eq('id', appointmentId)
              .eq('nurse_id', user?.id ?? '');

            if (error) {
              Alert.alert('Erreur', error.message);
              return;
            }
            await fetchAppointments();
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Mark as completed
  // -------------------------------------------------------------------------

  const handleComplete = async (appointmentId: string) => {
    setCompletingId(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)
        .eq('nurse_id', user?.id ?? '');

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, status: 'completed' } : a
        )
      );
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setCompletingId(null);
    }
  };

  const confirmComplete = (appointmentId: string, patientName: string) => {
    Alert.alert(
      'Confirmer le soin',
      `Marquer le soin de ${patientName} comme terminé ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminé', onPress: () => handleComplete(appointmentId) },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Departure time editing
  // -------------------------------------------------------------------------

  const startEditDeparture = () => {
    setDepartureInput(departureTime);
    setEditingDeparture(true);
  };

  const saveDeparture = () => {
    const match = departureInput.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setDepartureTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        setEditingDeparture(false);
        return;
      }
    }
    Alert.alert('Erreur', 'Format invalide. Utilisez HH:MM');
  };

  // -------------------------------------------------------------------------
  // Build ordered list for display
  // -------------------------------------------------------------------------

  const getOrderedAppointments = (): TourAppointment[] => {
    if (!tourResult || tourResult.order.length === 0) return appointments;

    const withGPS = appointments.filter((a) => a.gps);
    const withoutGPS = appointments.filter((a) => !a.gps);

    const ordered = tourResult.order.map((idx) => withGPS[idx]);
    return [...ordered, ...withoutGPS];
  };

  const getEstimatedArrival = (appt: TourAppointment): string | null => {
    if (!tourResult) return null;
    const withGPS = appointments.filter((a) => a.gps);
    const idx = withGPS.findIndex((a) => a.id === appt.id);
    if (idx === -1) return null;
    return tourResult.estimatedArrivals[idx] || null;
  };

  const getLegInfo = (appt: TourAppointment): { distance: number; duration: number } | null => {
    if (!tourResult) return null;
    const withGPS = appointments.filter((a) => a.gps);
    const idx = withGPS.findIndex((a) => a.id === appt.id);
    if (idx === -1) return null;
    const leg = tourResult.legs.find((l) => l.toIndex === idx);
    if (!leg) return null;
    return { distance: leg.distanceKm, duration: leg.durationMin };
  };

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const totalRDV = appointments.length;
  const completedRDV = appointments.filter((a) => a.status === 'completed').length;
  const remainingRDV = totalRDV - completedRDV;

  // -------------------------------------------------------------------------
  // Map markers (in optimized order)
  // -------------------------------------------------------------------------

  const withGPSAppointments = appointments.filter((a) => a.gps);
  const orderedForMarkers = tourResult && tourResult.order.length > 0
    ? tourResult.order.map((idx) => withGPSAppointments[idx])
    : withGPSAppointments;

  const markers = useMemo(
    () =>
      orderedForMarkers.map((a, index) => {
        const config = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
        return {
          id: a.id,
          coordinate: {
            latitude: a.gps!.lat,
            longitude: a.gps!.lng,
          },
          title: a.patient_name,
          subtitle: `${a.care_type} — ${a.duration_min} min`,
          index: index + 1,
          color: config.color,
        };
      }),
    [orderedForMarkers],
  );

  // -------------------------------------------------------------------------
  // Fit map to markers (only once on initial load)
  // -------------------------------------------------------------------------

  const hasFitted = useRef(false);

  const fitMapToMarkers = useCallback(() => {
    if (markers.length === 0 || !mapRef.current) return;
    const coordinates = markers.map((m) => m.coordinate);
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [markers]);

  useEffect(() => {
    if (!loading && markers.length > 0 && !hasFitted.current) {
      hasFitted.current = true;
      setTimeout(fitMapToMarkers, 500);
    }
  }, [loading, markers.length, fitMapToMarkers]);

  // -------------------------------------------------------------------------
  // Render patient card
  // -------------------------------------------------------------------------

  const renderCard = ({ item }: { item: TourAppointment }) => {
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const isCompleted = item.status === 'completed';
    const isCompleting = completingId === item.id;
    const isSelected = selectedId === item.id;
    const hasGPS = item.gps != null;
    const estimatedArrival = getEstimatedArrival(item);
    const legInfo = getLegInfo(item);

    // Find display index
    const ordered = getOrderedAppointments();
    const displayIndex = ordered.findIndex((a) => a.id === item.id) + 1;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isCompleted && styles.cardCompleted,
          isSelected && styles.cardSelected,
        ]}
        activeOpacity={0.8}
        onPress={() => setSelectedId(isSelected ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.numberBadge, { backgroundColor: config.color }]}>
            <Text style={styles.numberText}>{displayIndex}</Text>
          </View>

          <View style={styles.cardMainInfo}>
            {estimatedArrival && (
              <Text style={[styles.cardTime, isCompleted && styles.textMuted]}>
                {estimatedArrival}
              </Text>
            )}
            {item.time && !estimatedArrival && (
              <Text style={[styles.cardTime, isCompleted && styles.textMuted]}>
                {formatTime(item.time)}
              </Text>
            )}
            <Text
              style={[styles.cardPatientName, isCompleted && styles.textMuted]}
              numberOfLines={1}
            >
              {item.patient_name}
            </Text>
            <Text style={styles.cardCareType}>{item.care_type}</Text>
            <Text style={styles.cardDuration}>{item.duration_min} min</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: config.color + '20', borderColor: config.color },
            ]}
          >
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.cardAddressRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.TEXT_MUTED} />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.address_label ?? 'Adresse non renseignée'}
          </Text>
        </View>

        {/* Travel info */}
        {legInfo && legInfo.distance > 0 && (
          <View style={styles.travelRow}>
            <Ionicons name="car-outline" size={14} color={COLORS.NURSE_PRIMARY} />
            <Text style={styles.travelText}>
              {legInfo.distance} km · {legInfo.duration} min
            </Text>
          </View>
        )}

        {/* Actions */}
        {isSelected && (
          <View style={styles.cardActions}>
            {hasGPS && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openNavigation(item.gps!.lat, item.gps!.lng)}
              >
                <Ionicons name="navigate" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Y aller</Text>
              </TouchableOpacity>
            )}

            {!isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.SUCCESS }]}
                onPress={() => confirmComplete(item.id, item.patient_name)}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>Terminé</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {item.patient_phone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.INFO }]}
                onPress={() => Linking.openURL(`tel:${item.patient_phone}`)}
              >
                <Ionicons name="call" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => {
                const patientId = appointments.find(a => a.id === item.id)?.patient_file_id;
                navigation.navigate('PatientDetail', {
                  patientFileId: item.patient_file_id,
                });
              }}
            >
              <Ionicons name="person-outline" size={18} color={COLORS.NURSE_PRIMARY} />
              <Text style={[styles.actionBtnText, { color: COLORS.NURSE_PRIMARY }]}>Fiche</Text>
            </TouchableOpacity>

            {!isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.DANGER }]}
                onPress={() => handleRemove(item.id, item.patient_name)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Retirer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
          <Text style={styles.loadingText}>Chargement de la tournée...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderedAppointments = getOrderedAppointments();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ma Tournée</Text>
          <Text style={styles.headerDate}>{formatDateLabel(selectedDate)}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchAppointments}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.NURSE_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Date strip */}
      <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      {/* Departure time */}
      <View style={styles.departureBar}>
        <Ionicons name="time-outline" size={18} color={COLORS.NURSE_PRIMARY} />
        <Text style={styles.departureLabel}>Départ :</Text>
        {editingDeparture ? (
          <View style={styles.departureEditRow}>
            <TextInput
              style={styles.departureInput}
              value={departureInput}
              onChangeText={setDepartureInput}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              autoFocus
              onBlur={saveDeparture}
              onSubmitEditing={saveDeparture}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.TEXT_MUTED}
            />
            <TouchableOpacity onPress={saveDeparture}>
              <Ionicons name="checkmark" size={20} color={COLORS.SUCCESS} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditDeparture} style={styles.departureValueBtn}>
            <Text style={styles.departureValue}>{departureTime}</Text>
            <Ionicons name="create-outline" size={14} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.addPatientBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={COLORS.WHITE} />
          <Text style={styles.addPatientBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      {markers.length > 0 && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={STRASBOURG_CENTER}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {markers.map((m) => (
              <Marker
                key={m.id}
                coordinate={m.coordinate}
                onPress={() => setSelectedId(m.id)}
              >
                <View
                  style={[
                    styles.markerBubble,
                    { backgroundColor: m.color },
                    selectedId === m.id && styles.markerSelected,
                  ]}
                >
                  <Text style={styles.markerText}>{m.index}</Text>
                </View>
                <Callout tooltip>
                  <View style={styles.calloutContent}>
                    <Text style={styles.calloutTitle}>{m.title}</Text>
                    <Text style={styles.calloutSubtitle}>{m.subtitle}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRDV}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>{completedRDV}</Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.WARNING }]}>{remainingRDV}</Text>
          <Text style={styles.statLabel}>Restants</Text>
        </View>
      </View>

      {/* Tour summary */}
      {tourResult && tourResult.order.length > 0 && (
        <View style={styles.tourSummary}>
          {tourLoading ? (
            <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} />
          ) : (
            <>
              <Ionicons name="map" size={16} color={COLORS.NURSE_PRIMARY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tourSummaryText}>
                  {tourResult.totalDistanceKm} km · {tourResult.totalDurationMin} min de route
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Patients list */}
      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun patient</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez des patients à votre tournée pour {selectedDate === getTodayISO() ? "aujourd'hui" : 'ce jour'}.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={18} color={COLORS.WHITE} />
            <Text style={styles.emptyButtonText}>Ajouter un patient</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orderedAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPatient}
        existingFileIds={appointments.map((a) => a.patient_file_id)}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.MD,
  },
  loadingText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerDate: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Date strip
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SIZES.SM,
    paddingVertical: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: SIZES.XS,
    paddingHorizontal: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    minWidth: 38,
  },
  dateChipSelected: {
    backgroundColor: COLORS.NURSE_PRIMARY,
  },
  dateChipToday: {
    backgroundColor: COLORS.NURSE_LIGHT,
  },
  dateChipDay: {
    fontSize: 10,
    color: COLORS.TEXT_MUTED,
    textTransform: 'capitalize',
  },
  dateChipDaySelected: {
    color: COLORS.WHITE,
  },
  dateChipNum: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  dateChipNumSelected: {
    color: COLORS.WHITE,
  },
  // Departure bar
  departureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: SIZES.SM,
  },
  departureLabel: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  departureEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.XS,
  },
  departureInput: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    minWidth: 60,
    textAlign: 'center',
  },
  departureValueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  departureValue: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    marginLeft: 'auto',
    gap: 4,
  },
  addPatientBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
  // Map
  mapContainer: {
    height: MAP_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  map: {
    flex: 1,
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerSelected: {
    transform: [{ scale: 1.3 }],
    borderColor: COLORS.BLACK,
  },
  markerText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  calloutContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    minWidth: 150,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  calloutSubtitle: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.BORDER,
  },
  // Tour summary
  tourSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_LIGHT,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: SIZES.SM,
  },
  tourSummaryText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  // List
  listContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Card
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.SM,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompleted: {
    borderLeftColor: COLORS.SUCCESS,
    opacity: 0.8,
  },
  cardSelected: {
    borderLeftColor: COLORS.NURSE_PRIMARY,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.SM,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.SM,
  },
  numberText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
  },
  cardMainInfo: {
    flex: 1,
    marginRight: SIZES.SM,
  },
  cardTime: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  cardPatientName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  cardCareType: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  cardDuration: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAddress: {
    flex: 1,
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginLeft: 6,
  },
  textMuted: {
    opacity: 0.6,
  },
  // Travel info
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.XS,
    gap: SIZES.XS,
  },
  travelText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  // Actions
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.SM,
    marginTop: SIZES.MD,
    paddingTop: SIZES.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 4,
  },
  actionBtnOutline: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.NURSE_PRIMARY,
  },
  actionBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
  },
  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.SM,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SIZES.SM,
  },
  emptySubtitle: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    gap: SIZES.XS,
    marginTop: SIZES.SM,
  },
  emptyButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.MD,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    height: '85%',
    maxHeight: '85%',
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
  modalSectionTitle: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    paddingHorizontal: SIZES.LG,
    paddingTop: SIZES.MD,
    paddingBottom: SIZES.SM,
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
  careTypeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.SM,
    paddingVertical: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: SIZES.SM,
  },
  careTypeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    paddingHorizontal: SIZES.MD,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
  },
  careTypeAddBtn: {
    width: 44,
    height: 44,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    backgroundColor: COLORS.NURSE_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    padding: SIZES.LG,
  },
  // Selected patient row
  selectedPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.NURSE_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  selectedPatientName: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SIZES.SM,
  },
  changeBtn: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.NURSE_PRIMARY,
  },
  // Care type dropdown
  careTypeDropdown: {
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.XS,
    maxHeight: 400,
  },
  // Add form (inside modal)
  addForm: {
    padding: SIZES.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  formLabel: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.XS,
    marginTop: SIZES.SM,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    paddingHorizontal: SIZES.MD,
    height: 44,
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
  durationRow: {
    flexDirection: 'row',
    gap: SIZES.SM,
    flexWrap: 'wrap',
  },
  durationChip: {
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  durationChipSelected: {
    borderColor: COLORS.NURSE_PRIMARY,
    backgroundColor: COLORS.NURSE_LIGHT,
  },
  durationChipText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  durationChipTextSelected: {
    color: COLORS.NURSE_PRIMARY,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    paddingHorizontal: SIZES.MD,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SIZES.SM,
    height: '100%',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.LG,
    gap: SIZES.SM,
  },
  addBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
  },
});

export default TourneeScreen;
