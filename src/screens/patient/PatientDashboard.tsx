import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMessageCount } from '../../contexts/MessageCountContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import LogoutButton from '../../components/LogoutButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpcomingAppointment {
  id: string;
  nurseName: string;
  date: string;
  time: string;
  careType: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Stats {
  upcomingRDV: number;
  recentCares: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time.substring(0, 5);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:   { color: COLORS.WARNING, label: 'En attente' },
  confirmed: { color: COLORS.NURSE_PRIMARY, label: 'Confirmé' },
  completed: { color: COLORS.TEXT_MUTED, label: 'Terminé' },
  cancelled: { color: COLORS.DANGER, label: 'Annulé' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PatientDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile, user } = useAuth();
  const { unreadCount } = useMessageCount();
  const today = getTodayISO();

  const [stats, setStats] = useState<Stats>({ upcomingRDV: 0, recentCares: 0 });
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Get patient_file_ids for this patient
      const { data: myFiles } = await supabase
        .from('patient_files')
        .select('id')
        .eq('patient_id', user.id)
        .eq('is_active', true);

      const fileIds = (myFiles ?? []).map((f: any) => f.id);

      if (fileIds.length === 0) {
        setLoading(false);
        return;
      }

      // Upcoming appointments count
      const { count: upcomingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('patient_file_id', fileIds)
        .gte('date', today);

      // Recent completed cares
      const { count: recentCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('patient_file_id', fileIds)
        .eq('status', 'completed');

      setStats({
        upcomingRDV: upcomingCount ?? 0,
        recentCares: recentCount ?? 0,
      });

      // Fetch next 5 appointments
      const { data: appts, error: apptsErr } = await supabase
        .from('appointments')
        .select('id, patient_file_id, nurse_id, date, time, care_type, status')
        .in('patient_file_id', fileIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);

      if (apptsErr) {
        console.error('[PatientDashboard] appointments error:', apptsErr.message);
        return;
      }

      // Get nurse names
      const nurseIds = [...new Set((appts ?? []).map((a: any) => a.nurse_id))];
      let nurseMap: Record<string, string> = {};

      if (nurseIds.length > 0) {
        const { data: nurses } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', nurseIds);

        (nurses ?? []).forEach((n: any) => {
          nurseMap[n.id] = `${n.first_name} ${n.last_name}`;
        });
      }

      const mapped: UpcomingAppointment[] = (appts ?? []).map((a: any) => ({
        id: a.id,
        nurseName: nurseMap[a.nurse_id] ?? 'Infirmière',
        date: a.date,
        time: a.time,
        careType: a.care_type,
        status: a.status,
      }));

      setAppointments(mapped);
    } catch (err) {
      console.error('[PatientDashboard] unexpected:', err);
    }
  }, [user, today]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Render appointment
  // -------------------------------------------------------------------------

  const renderAppointmentItem = ({ item }: { item: UpcomingAppointment }) => {
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;

    return (
      <TouchableOpacity style={styles.appointmentCard} activeOpacity={0.8}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.nurseName}>{item.nurseName}</Text>
            <Text style={styles.appointmentType}>{item.careType}</Text>
          </View>
          <View style={styles.appointmentTime}>
            <Text style={styles.time}>{formatTime(item.time)}</Text>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
            <Text style={styles.statusText}>{config.label}</Text>
          </View>
        </View>
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
          <ActivityIndicator size="large" color={COLORS.PATIENT_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PATIENT_PRIMARY]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={32} color={COLORS.PATIENT_PRIMARY} />
            </TouchableOpacity>
            <LogoutButton
              variant="icon"
              showText={false}
              style={styles.logoutButtonHeader}
            />
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="heart" size={24} color={COLORS.PATIENT_PRIMARY} />
            <Text style={styles.statusTitle}>Statut de vos soins</Text>
          </View>
          <View style={styles.statusContent}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{stats.upcomingRDV}</Text>
              <Text style={styles.statusLabel}>Prochains RDV</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{stats.recentCares}</Text>
              <Text style={styles.statusLabel}>Soins reçus</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, unreadCount > 0 && { color: COLORS.WARNING }]}>
                {unreadCount}
              </Text>
              <Text style={styles.statusLabel}>Messages</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prochains rendez-vous</Text>
          </View>

          {appointments.length > 0 ? (
            <FlatList
              data={appointments}
              renderItem={renderAppointmentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.BORDER} />
              <Text style={styles.emptyStateText}>Aucun rendez-vous à venir</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.LG,
    backgroundColor: COLORS.WHITE,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.SM,
  },
  greeting: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_SECONDARY,
  },
  userName: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  profileButton: {
    padding: SIZES.XS,
  },
  logoutButtonHeader: {
    backgroundColor: 'transparent',
    borderColor: COLORS.DANGER,
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: COLORS.WHITE,
    margin: SIZES.LG,
    padding: SIZES.LG,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.MD,
  },
  statusTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SIZES.SM,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.PATIENT_PRIMARY,
  },
  statusLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: SIZES.XS,
  },
  section: {
    paddingHorizontal: SIZES.LG,
    marginBottom: SIZES.LG,
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
  },
  appointmentCard: {
    backgroundColor: COLORS.WHITE,
    padding: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginBottom: SIZES.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.SM,
  },
  appointmentInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  appointmentType: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  date: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  statusText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: SIZES.SM,
  },
  emptyStateText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_MUTED,
    marginTop: SIZES.SM,
  },
});

export default PatientDashboard;
