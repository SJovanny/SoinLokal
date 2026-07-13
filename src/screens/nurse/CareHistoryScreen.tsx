import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Appointment } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import CompletionModal, { type CareNotesData } from '../../components/CompletionModal';
import MonthYearFilter from '../../components/MonthYearFilter';

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

const CareHistoryScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { patientId, patientName } = route.params;
  const { user } = useAuth();
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredHistory = selectedMonth
    ? history.filter((a) => a.date.startsWith(selectedMonth))
    : history;

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: file } = await supabase
        .from('patient_files')
        .select('id')
        .eq('patient_id', patientId)
        .eq('nurse_id', user.id)
        .single();

      if (!file) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_file_id', file.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) {
        console.error('[CareHistory] fetch error:', error.message);
        return;
      }

      setHistory((data as Appointment[]) ?? []);
    } catch (err) {
      console.error('[CareHistory] unexpected:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSaveNotes = async (data: CareNotesData) => {
    if (!editingAppointment || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          care_performed: data.care_performed || null,
          observations: data.observations || null,
          remarks: data.remarks || null,
          visible_to_patient: data.visible_to_patient,
        })
        .eq('id', editingAppointment.id)
        .eq('nurse_id', user.id);

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      setHistory((prev) =>
        prev.map((a) =>
          a.id === editingAppointment.id
            ? {
                ...a,
                care_performed: data.care_performed || undefined,
                observations: data.observations || undefined,
                remarks: data.remarks || undefined,
                visible_to_patient: data.visible_to_patient,
              }
            : a
        )
      );
      setEditModalVisible(false);
      setEditingAppointment(null);
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render item
  // -------------------------------------------------------------------------

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.careTypeBadge}>
            <Text style={styles.careTypeText}>{item.care_type}</Text>
          </View>
          <Text style={styles.cardDate}>
            {formatDate(item.date)}
            {item.time ? ` · ${formatTime(item.time)}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setEditingAppointment(item);
            setEditModalVisible(true);
          }}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.NURSE_PRIMARY} />
        </TouchableOpacity>
      </View>

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
        <Text style={styles.noNotes}>Aucune note renseignée</Text>
      ) : null}

      <View style={styles.visibilityRow}>
        <Ionicons
          name={item.visible_to_patient ? 'eye-outline' : 'eye-off-outline'}
          size={14}
          color={item.visible_to_patient ? COLORS.NURSE_PRIMARY : COLORS.TEXT_MUTED}
        />
        <Text style={[styles.visibilityText, item.visible_to_patient && { color: COLORS.NURSE_PRIMARY }]}>
          {item.visible_to_patient ? 'Visible par le patient' : 'Masqué pour le patient'}
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------------------
  // Main render
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historique</Text>
          <Text style={styles.headerSubtitle}>{patientName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Month/Year Filter */}
      {!loading && history.length > 0 && (
        <MonthYearFilter
          appointments={history}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          accentColor={COLORS.NURSE_PRIMARY}
          lightColor={COLORS.NURSE_LIGHT}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="document-text-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun soin</Text>
          <Text style={styles.emptySubtitle}>
            {selectedMonth
              ? 'Aucun soin pour cette période.'
              : "L'historique des soins apparaîtra ici une fois les soins terminés."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Modal */}
      {editingAppointment && (
        <CompletionModal
          visible={editModalVisible}
          patientName={patientName}
          careType={editingAppointment.care_type}
          date={editingAppointment.date}
          time={editingAppointment.time}
          existingData={{
            care_performed: editingAppointment.care_performed ?? undefined,
            observations: editingAppointment.observations ?? undefined,
            remarks: editingAppointment.remarks ?? undefined,
            visible_to_patient: editingAppointment.visible_to_patient,
          }}
          onClose={() => {
            setEditModalVisible(false);
            setEditingAppointment(null);
          }}
          onSave={handleSaveNotes}
          saving={saving}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: SIZES.FONT_XS,
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SIZES.SM,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  careTypeBadge: {
    backgroundColor: COLORS.NURSE_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  careTypeText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.NURSE_PRIMARY,
  },
  cardDate: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: SIZES.SM,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SIZES.XS,
  },
  visibilityText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
});

export default CareHistoryScreen;
