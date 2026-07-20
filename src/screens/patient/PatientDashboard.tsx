import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../utils/supabase';
import { getColors, SIZES } from '../../utils/constants';
import LogoutButton from '../../components/LogoutButton';
import Avatar from '../../components/Avatar';

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

interface RecentCare {
  id: string;
  nurseName: string;
  date: string;
  careType: string;
  carePerformed?: string;
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

function getStatusConfig(colors: ReturnType<typeof getColors>): Record<string, { color: string; label: string }> {
  return {
    pending:   { color: colors.WARNING, label: 'En attente' },
    confirmed: { color: colors.NURSE_PRIMARY, label: 'Confirmé' },
    completed: { color: colors.TEXT_MUTED, label: 'Terminé' },
    cancelled: { color: colors.DANGER, label: 'Annulé' },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PatientDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile, user } = useAuth();
  const { unreadCount } = useMessageCount();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = useMemo(() => getStatusConfig(colors), [colors]);
  const today = getTodayISO();

  const [stats, setStats] = useState<Stats>({ upcomingRDV: 0, recentCares: 0 });
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [recentCares, setRecentCares] = useState<RecentCare[]>([]);
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
        .gte('date', today)
        .in('status', ['pending', 'confirmed']);

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
        .in('status', ['pending', 'confirmed'])
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

      // Recent completed cares (last 5)
      const { data: recent } = await supabase
        .from('appointments')
        .select('id, nurse_id, date, care_type, care_performed, visible_to_patient')
        .in('patient_file_id', fileIds)
        .eq('status', 'completed')
        .eq('visible_to_patient', true)
        .order('date', { ascending: false })
        .limit(5);

      const recentNurseIds = [...new Set((recent ?? []).map((a: any) => a.nurse_id))];
      let recentNurseMap: Record<string, string> = {};
      if (recentNurseIds.length > 0) {
        const { data: nurses } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', recentNurseIds);
        (nurses ?? []).forEach((n: any) => {
          recentNurseMap[n.id] = `${n.first_name} ${n.last_name}`;
        });
      }

      setRecentCares(
        (recent ?? []).map((a: any) => ({
          id: a.id,
          nurseName: recentNurseMap[a.nurse_id] ?? 'Infirmière',
          date: a.date,
          careType: a.care_type,
          carePerformed: a.care_performed,
        }))
      );
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
  // Render recent care
  // -------------------------------------------------------------------------

  const renderRecentCare = ({ item }: { item: RecentCare }) => (
    <View style={styles.careCard}>
      <View style={styles.careHeader}>
        <Text style={styles.careType}>{item.careType}</Text>
        <Text style={styles.careDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.careNurse}>{item.nurseName}</Text>
      {item.carePerformed ? (
        <Text style={styles.careNote} numberOfLines={2}>{item.carePerformed}</Text>
      ) : null}
    </View>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.PATIENT_PRIMARY} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.PATIENT_PRIMARY]} />
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
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profil')}
            >
              <Avatar
                photoUrl={userProfile?.photo_url}
                avatarType={userProfile?.avatar_type ?? null}
                avatarSeed={userProfile?.avatar_seed}
                firstName={userProfile?.first_name}
                lastName={userProfile?.last_name}
                size={36}
                backgroundColor={colors.PATIENT_LIGHT}
                textColor={colors.PATIENT_PRIMARY}
              />
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
            <Ionicons name="heart" size={24} color={colors.PATIENT_PRIMARY} />
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
              <Text style={[styles.statusValue, unreadCount > 0 && { color: colors.WARNING }]}>
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
              <Ionicons name="calendar-outline" size={48} color={colors.BORDER} />
              <Text style={styles.emptyStateText}>Aucun rendez-vous à venir</Text>
            </View>
          )}
        </View>

        {/* Recent Cares */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Derniers soins</Text>
            {recentCares.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Historique')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.PATIENT_PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          {recentCares.length > 0 ? (
            <FlatList
              data={recentCares}
              renderItem={renderRecentCare}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.BORDER} />
              <Text style={styles.emptyStateText}>Aucun soin récent</Text>
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

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
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
    backgroundColor: colors.WHITE,
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
    color: colors.TEXT_SECONDARY,
  },
  userName: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: colors.TEXT_PRIMARY,
  },
  profileButton: {
    padding: SIZES.XS,
  },
  logoutButtonHeader: {
    backgroundColor: 'transparent',
    borderColor: colors.DANGER,
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: colors.WHITE,
    margin: SIZES.LG,
    padding: SIZES.LG,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    shadowColor: colors.BLACK,
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
    color: colors.TEXT_PRIMARY,
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
    color: colors.PATIENT_PRIMARY,
  },
  statusLabel: {
    fontSize: SIZES.FONT_XS,
    color: colors.TEXT_MUTED,
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
    color: colors.TEXT_PRIMARY,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: colors.PATIENT_PRIMARY,
  },
  appointmentCard: {
    backgroundColor: colors.WHITE,
    padding: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginBottom: SIZES.SM,
    shadowColor: colors.BLACK,
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
    color: colors.TEXT_PRIMARY,
  },
  appointmentType: {
    fontSize: SIZES.FONT_SM,
    color: colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: colors.TEXT_PRIMARY,
  },
  date: {
    fontSize: SIZES.FONT_XS,
    color: colors.TEXT_MUTED,
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
    color: colors.WHITE,
    fontWeight: '600',
  },
  careCard: {
    backgroundColor: colors.WHITE,
    padding: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginBottom: SIZES.SM,
    borderLeftWidth: 3,
    borderLeftColor: colors.PATIENT_LIGHT,
    shadowColor: colors.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  careHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.XS,
  },
  careType: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: colors.PATIENT_PRIMARY,
  },
  careDate: {
    fontSize: SIZES.FONT_XS,
    color: colors.TEXT_MUTED,
  },
  careNurse: {
    fontSize: SIZES.FONT_SM,
    color: colors.TEXT_SECONDARY,
    marginBottom: SIZES.XS,
  },
  careNote: {
    fontSize: SIZES.FONT_SM,
    color: colors.TEXT_PRIMARY,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: SIZES.SM,
  },
  emptyStateText: {
    fontSize: SIZES.FONT_MD,
    color: colors.TEXT_MUTED,
    marginTop: SIZES.SM,
  },
  });
}

export default PatientDashboard;
