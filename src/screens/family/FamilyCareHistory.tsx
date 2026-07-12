import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Appointment, type FamilyLink } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedPatient {
  patientFileId: string;
  patientId: string;
  firstName: string;
  lastName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.substring(0, 5).replace(':', 'h');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FamilyCareHistory: React.FC = () => {
  const { user, familyLinks } = useAuth();
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch linked patients (via family_links + managed_by)
  // -------------------------------------------------------------------------

  const fetchLinkedPatients = useCallback(async () => {
    if (!user) return;
    setLoadingPatients(true);

    try {
      const patients: LinkedPatient[] = [];

      // Source 1: family_links
      if (familyLinks.length > 0) {
        const fileIds = familyLinks.map((l) => l.patient_file_id);

        const { data: files } = await supabase
          .from('patient_files')
          .select('id, patient_id')
          .in('id', fileIds);

        if (files && files.length > 0) {
          const patientIds = files.map((f: any) => f.patient_id);

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', patientIds);

          const profileMap: Record<string, { firstName: string; lastName: string }> = {};
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.id] = { firstName: p.first_name, lastName: p.last_name };
          });

          files.forEach((f: any) => {
            const profile = profileMap[f.patient_id];
            patients.push({
              patientFileId: f.id,
              patientId: f.patient_id,
              firstName: profile?.firstName ?? 'Proche',
              lastName: profile?.lastName ?? '',
            });
          });
        }
      }

      // Source 2: managed patients (via patient_profiles.managed_by)
      const { data: managedProfiles } = await supabase
        .from('patient_profiles')
        .select('profile_id')
        .eq('managed_by', user.id)
        .eq('is_managed', true);

      if (managedProfiles && managedProfiles.length > 0) {
        const managedIds = managedProfiles.map((p: any) => p.profile_id);
        const existingIds = new Set(patients.map((p) => p.patientId));
        const newManagedIds = managedIds.filter((id: string) => !existingIds.has(id));

        if (newManagedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', newManagedIds);

          const { data: existingFiles } = await supabase
            .from('patient_files')
            .select('id, patient_id')
            .in('patient_id', newManagedIds);

          const fileMap: Record<string, string> = {};
          (existingFiles ?? []).forEach((f: any) => {
            fileMap[f.patient_id] = f.id;
          });

          (profiles ?? []).forEach((p: any) => {
            const fileId = fileMap[p.id];
            if (fileId) {
              patients.push({
                patientFileId: fileId,
                patientId: p.id,
                firstName: p.first_name ?? 'Proche',
                lastName: p.last_name ?? '',
              });
            }
          });
        }
      }

      setLinkedPatients(patients);
      if (patients.length > 0 && !selectedPatient) {
        setSelectedPatient(patients[0]);
      }
    } catch (err) {
      console.error('[FamilyCareHistory] fetchLinkedPatients error:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, [user, familyLinks]);

  // -------------------------------------------------------------------------
  // Fetch care history for selected patient
  // -------------------------------------------------------------------------

  const fetchHistory = useCallback(async () => {
    if (!selectedPatient) return;
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, nurse:profiles!nurse_id(id, first_name, last_name)')
        .eq('patient_file_id', selectedPatient.patientFileId)
        .eq('status', 'completed')
        .eq('visible_to_patient', true)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) {
        console.error('[FamilyCareHistory] fetch error:', error.message);
        setHistory([]);
        return;
      }

      setHistory((data as Appointment[]) ?? []);
    } catch (err) {
      console.error('[FamilyCareHistory] unexpected:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    fetchLinkedPatients();
  }, [fetchLinkedPatients]);

  useEffect(() => {
    if (selectedPatient) {
      fetchHistory();
    }
  }, [selectedPatient, fetchHistory]);

  // -------------------------------------------------------------------------
  // Render patient selector
  // -------------------------------------------------------------------------

  const renderPatientSelector = () => {
    if (linkedPatients.length <= 1) return null;

    return (
      <View style={styles.selectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
          {linkedPatients.map((patient) => {
            const isSelected = selectedPatient?.patientId === patient.patientId;
            return (
              <TouchableOpacity
                key={patient.patientId}
                style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                onPress={() => {
                  setSelectedPatient(patient);
                  setHistory([]);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? 'person' : 'person-outline'}
                  size={16}
                  color={isSelected ? COLORS.WHITE : COLORS.FAMILY_PRIMARY}
                />
                <Text style={[styles.selectorChipText, isSelected && styles.selectorChipTextActive]}>
                  {patient.firstName} {patient.lastName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // Render item
  // -------------------------------------------------------------------------

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.careTypeBadge}>
          <Text style={styles.careTypeText}>{item.care_type}</Text>
        </View>
        <Text style={styles.cardDate}>
          {formatDate(item.date)}
          {item.time ? ` · ${formatTime(item.time)}` : ''}
        </Text>
      </View>

      {item.nurse && (
        <View style={styles.nurseRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.TEXT_MUTED} />
          <Text style={styles.nurseName}>{item.nurse.first_name} {item.nurse.last_name}</Text>
        </View>
      )}

      {item.duration_min ? (
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.TEXT_MUTED} />
          <Text style={styles.durationText}>{item.duration_min} min</Text>
        </View>
      ) : null}

      {item.care_performed ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Soins réalisés</Text>
          <Text style={styles.noteText}>{item.care_performed}</Text>
        </View>
      ) : null}

      {item.observations ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Observations</Text>
          <Text style={styles.noteText}>{item.observations}</Text>
        </View>
      ) : null}

      {item.remarks ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Remarques</Text>
          <Text style={styles.noteText}>{item.remarks}</Text>
        </View>
      ) : null}

      {!item.care_performed && !item.observations && !item.remarks ? (
        <Text style={styles.noNotes}>Soin réalisé — aucune note détaillée</Text>
      ) : null}
    </View>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  if (loadingPatients) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historique des soins</Text>
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.FAMILY_PRIMARY} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (linkedPatients.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historique des soins</Text>
        </View>
        <View style={styles.centerWrap}>
          <Ionicons name="people-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun proche associé</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez un proche depuis l'écran d'accueil pour consulter son historique de soins.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des soins</Text>
        {selectedPatient && linkedPatients.length <= 1 && (
          <Text style={styles.headerSubtitle}>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </Text>
        )}
      </View>

      {/* Patient selector */}
      {renderPatientSelector()}

      {/* Content */}
      {loadingHistory ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.FAMILY_PRIMARY} />
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="document-text-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun soin</Text>
          <Text style={styles.emptySubtitle}>
            Les soins réalisés apparaîtront ici lorsque l'infirmier(e) les aura documentés et rendus visibles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingVertical: SIZES.LG,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.MD,
    paddingHorizontal: SIZES.XXL,
  },
  loadingText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
  },
  emptyTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  emptySubtitle: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Patient selector
  selectorContainer: {
    backgroundColor: COLORS.WHITE,
    paddingVertical: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  selectorScroll: {
    paddingHorizontal: SIZES.LG,
    gap: SIZES.SM,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    borderWidth: 1.5,
    borderColor: COLORS.FAMILY_PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  selectorChipActive: {
    backgroundColor: COLORS.FAMILY_PRIMARY,
    borderColor: COLORS.FAMILY_PRIMARY,
  },
  selectorChipText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.FAMILY_PRIMARY,
  },
  selectorChipTextActive: {
    color: COLORS.WHITE,
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
    marginBottom: SIZES.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.FAMILY_PRIMARY,
  },
  cardHeader: {
    marginBottom: SIZES.SM,
  },
  careTypeBadge: {
    backgroundColor: COLORS.FAMILY_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  careTypeText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.FAMILY_PRIMARY,
  },
  cardDate: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SIZES.SM,
  },
  durationText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
  nurseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SIZES.SM,
  },
  nurseName: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  // Notes
  noteBlock: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    marginBottom: SIZES.SM,
  },
  noteLabel: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  noteText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  noNotes: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
});

export default FamilyCareHistory;
