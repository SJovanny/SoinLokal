import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Appointment } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import MonthYearFilter from '../../components/MonthYearFilter';
import { exportCareHistoryToPDF } from '../../utils/pdfExport';

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

const PatientCareHistory: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const filteredHistory = selectedMonth
    ? history.filter((a) => a.date.startsWith(selectedMonth))
    : history;

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: files } = await supabase
        .from('patient_files')
        .select('id')
        .eq('patient_id', user.id);

      const fileIds = (files ?? []).map((f: any) => f.id);

      if (fileIds.length === 0) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*, nurse:profiles!nurse_id(id, first_name, last_name)')
        .in('patient_file_id', fileIds)
        .eq('status', 'completed')
        .eq('visible_to_patient', true)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) {
        console.error('[PatientCareHistory] fetch error:', error.message);
        return;
      }

      setHistory((data as Appointment[]) ?? []);
    } catch (err) {
      console.error('[PatientCareHistory] unexpected:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des soins</Text>
        {filteredHistory.length > 0 && (
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() =>
              exportCareHistoryToPDF({
                appointments: filteredHistory,
                title: 'Historique des soins',
                subtitle: `Patient : ${user?.email ?? ''}`,
                accentColor: COLORS.PATIENT_PRIMARY,
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="download-outline" size={22} color={COLORS.PATIENT_PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Month/Year Filter */}
      {!loading && history.length > 0 && (
        <MonthYearFilter
          appointments={history}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          accentColor={COLORS.PATIENT_PRIMARY}
          lightColor={COLORS.PATIENT_LIGHT}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.PATIENT_PRIMARY} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="document-text-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun soin</Text>
          <Text style={styles.emptySubtitle}>
            {selectedMonth
              ? 'Aucun soin pour cette période.'
              : 'Vos soins réalisés apparaîtront ici lorsque votre infirmier(e) les aura documentés et rendus visibles.'}
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
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.PATIENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PATIENT_PRIMARY,
  },
  cardHeader: {
    marginBottom: SIZES.SM,
  },
  careTypeBadge: {
    backgroundColor: COLORS.PATIENT_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  careTypeText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.PATIENT_PRIMARY,
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

export default PatientCareHistory;
