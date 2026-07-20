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
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../utils/supabase';
import { getColors, SIZES } from '../../utils/constants';
import LogoutButton from '../../components/LogoutButton';
import Avatar from '../../components/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodayAppointment {
  id: string;
  patientName: string;
  time: string | null;
  careType: string;
  address: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Stats {
  totalPatients: number;
  todayVisits: number;
  completedToday: number;
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  title,
  value,
  color,
  styles,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  value: number | string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NurseDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile, user } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = getTodayISO();

  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayVisits: 0,
    completedToday: 0,
  });
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Parallel queries for stats
      const [patientsRes, todayRes, completedRes] = await Promise.all([
        supabase
          .from('patient_files')
          .select('id', { count: 'exact', head: true })
          .eq('nurse_id', user.id)
          .eq('is_active', true),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('nurse_id', user.id)
          .eq('date', today),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('nurse_id', user.id)
          .eq('date', today)
          .eq('status', 'completed'),
      ]);

      setStats({
        totalPatients: patientsRes.count ?? 0,
        todayVisits: todayRes.count ?? 0,
        completedToday: completedRes.count ?? 0,
      });

      // Fetch today's appointments with patient info
      const { data: appts, error: apptsErr } = await supabase
        .from('appointments')
        .select('id, patient_file_id, time, care_type, status, address')
        .eq('nurse_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (apptsErr) {
        console.error('[Dashboard] appointments error:', apptsErr.message);
        return;
      }

      // Get patient names
      const fileIds = (appts ?? []).map((a: any) => a.patient_file_id).filter(Boolean);
      let nameMap: Record<string, string> = {};
      let addrMap: Record<string, string> = {};

      if (fileIds.length > 0) {
        const { data: files } = await supabase
          .from('patient_files')
          .select('id, patient_id')
          .in('id', fileIds);

        const patientIds = (files ?? []).map((f: any) => f.patient_id);
        const fileIdToPatientId: Record<string, string> = {};
        (files ?? []).forEach((f: any) => {
          fileIdToPatientId[f.id] = f.patient_id;
        });

        if (patientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', patientIds);

          (profiles ?? []).forEach((p: any) => {
            // Find all file_ids for this patient
            Object.entries(fileIdToPatientId).forEach(([fid, pid]) => {
              if (pid === p.id) {
                nameMap[fid] = `${p.first_name} ${p.last_name}`;
              }
            });
          });
        }
      }

      const mapped: TodayAppointment[] = (appts ?? []).map((a: any) => ({
        id: a.id,
        patientName: nameMap[a.patient_file_id] ?? 'Patient',
        time: a.time,
        careType: a.care_type,
        address: a.address ?? '',
        status: a.status,
      }));

      setAppointments(mapped);
    } catch (err) {
      console.error('[Dashboard] unexpected:', err);
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

  const renderAppointmentItem = ({ item }: { item: TodayAppointment }) => {
    const isCompleted = item.status === 'completed';
    const statusColor = isCompleted ? colors.SUCCESS : colors.WARNING;

    return (
      <TouchableOpacity
        style={[styles.appointmentCard, isCompleted && styles.completedCard]}
        onPress={() => navigation.navigate('Tournée')}
        activeOpacity={0.8}
      >
        <View style={styles.appointmentHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.appointmentType}>{item.careType}</Text>
          </View>
          <View style={styles.timeContainer}>
            {item.time && <Text style={styles.time}>{formatTime(item.time)}</Text>}
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={statusColor}
            />
          </View>
        </View>
        {item.address ? (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color={colors.TEXT_MUTED} />
            <Text style={styles.address} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        ) : null}
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
          <ActivityIndicator size="large" color={colors.NURSE_PRIMARY} />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.NURSE_PRIMARY]}
          />
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
                backgroundColor={colors.NURSE_LIGHT}
                textColor={colors.NURSE_PRIMARY}
              />
            </TouchableOpacity>
            <LogoutButton variant="icon" showText={false} style={styles.logoutButtonHeader} />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="people-outline"
            title="Patients"
            value={stats.totalPatients}
            color={colors.NURSE_PRIMARY}
            styles={styles}
          />
          <StatCard
            icon="calendar-outline"
            title="Visites aujourd'hui"
            value={stats.todayVisits}
            color={colors.PATIENT_PRIMARY}
            styles={styles}
          />
          <StatCard
            icon="checkmark-circle-outline"
            title="Terminées"
            value={stats.completedToday}
            color={colors.SUCCESS}
            styles={styles}
          />
          <StatCard
            icon="time-outline"
            title="Restantes"
            value={stats.todayVisits - stats.completedToday}
            color={colors.WARNING}
            styles={styles}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Tournée')}
            >
              <Ionicons name="map-outline" size={24} color="white" />
              <Text style={styles.actionText}>Ma tournée</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.PATIENT_PRIMARY }]}
              onPress={() => navigation.navigate('Tournée', { openAddModal: true })}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Ajouter à la tournée</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.WARNING }]}
              onPress={() => navigation.navigate('Patients', { openSearch: true })}
            >
              <Ionicons name="person-add-outline" size={24} color="white" />
              <Text style={styles.actionText}>Nouveau patient</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tournée d'aujourd'hui</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tournée')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {appointments.length > 0 ? (
            <FlatList
              data={appointments}
              renderItem={renderAppointmentItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.BORDER} />
              <Text style={styles.emptyStateText}>Aucun patient dans la tournée</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Tournée', { openAddModal: true })}
              >
                <Ionicons name="add" size={18} color={colors.WHITE} />
                <Text style={styles.emptyButtonText}>Ajouter à la tournée</Text>
              </TouchableOpacity>
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
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: SIZES.LG,
      gap: SIZES.MD,
    },
    statCard: {
      width: '47%',
      backgroundColor: colors.WHITE,
      padding: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      alignItems: 'center',
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    statValue: {
      fontSize: SIZES.FONT_2XL,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
      marginTop: SIZES.XS,
    },
    statTitle: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
      textAlign: 'center',
      marginTop: SIZES.XS,
    },
    section: {
      paddingVertical: SIZES.XL,
      paddingHorizontal: SIZES.LG,
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
    seeAllText: {
      color: colors.NURSE_PRIMARY,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: SIZES.MD,
      paddingBottom: SIZES.SM,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.NURSE_PRIMARY,
      padding: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      alignItems: 'center',
      gap: SIZES.XS,
    },
    actionText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      textAlign: 'center',
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
    completedCard: {
      opacity: 0.7,
      borderLeftWidth: 4,
      borderLeftColor: colors.SUCCESS,
    },
    appointmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SIZES.SM,
    },
    patientName: {
      fontSize: SIZES.FONT_MD,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    appointmentType: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
      marginTop: 2,
    },
    timeContainer: {
      alignItems: 'center',
      gap: SIZES.XS,
    },
    time: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
    },
    address: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
      flex: 1,
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
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.NURSE_PRIMARY,
      paddingHorizontal: SIZES.LG,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      gap: SIZES.XS,
      marginTop: SIZES.SM,
    },
    emptyButtonText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
  });
}

export default NurseDashboard;
