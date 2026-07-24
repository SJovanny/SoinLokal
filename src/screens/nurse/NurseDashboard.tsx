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
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
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
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
        <View style={styles.appointmentTimeRail}>
          <Text style={styles.time}>{item.time ? formatTime(item.time) : '--:--'}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <View style={styles.appointmentHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.appointmentType}>{item.careType}</Text>
          </View>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'time-outline'}
            size={22}
            color={statusColor}
          />
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
            <View style={styles.greetingRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.greeting}>Bonjour,</Text>
            </View>
            <Text style={styles.userName}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
            <Text style={styles.headerCaption}>Votre tournée, en un coup d'œil</Text>
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
          <View style={styles.sectionHeadingBlock}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <Text style={styles.sectionSubtitle}>Les raccourcis essentiels</Text>
          </View>
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
            <View style={styles.sectionHeadingBlock}>
              <Text style={styles.sectionTitle}>Tournée d'aujourd'hui</Text>
              <Text style={styles.sectionSubtitle}>{appointments.length} visite{appointments.length !== 1 ? 's' : ''} planifiée{appointments.length !== 1 ? 's' : ''}</Text>
            </View>
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

function createStyles(colors: ReturnType<typeof getColors>, isDark: boolean) {
  const cardTextColor = isDark ? '#FFFFFF' : colors.TEXT_PRIMARY;
  const cardSecondaryTextColor = isDark ? '#FFFFFF' : colors.TEXT_SECONDARY;
  const cardMutedTextColor = isDark ? '#FFFFFF' : colors.TEXT_MUTED;

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
      paddingHorizontal: SIZES.LG,
      paddingTop: SIZES.LG,
      paddingBottom: SIZES.XL,
      backgroundColor: colors.WHITE,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
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
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
      marginBottom: SIZES.XS,
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.SUCCESS,
    },
    userName: {
      fontSize: 25,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    headerCaption: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
      marginTop: SIZES.XS,
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
      paddingHorizontal: SIZES.LG,
      paddingTop: SIZES.LG,
      gap: SIZES.SM,
    },
    statCard: {
      width: '48%',
      backgroundColor: colors.WHITE,
      padding: SIZES.SM,
      minHeight: 78,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderTopWidth: 3,
      flexDirection: 'row',
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    statIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SIZES.SM,
    },
    statContent: {
      flex: 1,
    },
    statValue: {
      fontSize: SIZES.FONT_2XL,
      fontWeight: '700',
      color: cardTextColor,
      marginTop: SIZES.XS,
    },
    statTitle: {
      fontSize: SIZES.FONT_XS,
      color: cardMutedTextColor,
      textAlign: 'center',
      marginTop: SIZES.XS,
    },
    section: {
      paddingTop: SIZES.XL,
      paddingHorizontal: SIZES.LG,
    },
    sectionHeadingBlock: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZES.MD,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    sectionSubtitle: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
      marginTop: 3,
    },
    seeAllText: {
      color: colors.NURSE_PRIMARY,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: SIZES.MD,
      marginTop: SIZES.MD,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.NURSE_PRIMARY,
      minHeight: 98,
      padding: SIZES.SM,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.XS,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    actionText: {
      color: isDark ? '#FFFFFF' : colors.WHITE,
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      textAlign: 'center',
    },
    appointmentCard: {
      backgroundColor: colors.WHITE,
      padding: SIZES.MD,
      paddingLeft: 68,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      marginBottom: SIZES.SM,
      minHeight: 94,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
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
      color: cardTextColor,
    },
    appointmentType: {
      fontSize: SIZES.FONT_SM,
      color: cardSecondaryTextColor,
      marginTop: 2,
    },
    appointmentTimeRail: {
      position: 'absolute',
      left: SIZES.MD,
      top: SIZES.MD,
      bottom: SIZES.MD,
      alignItems: 'center',
      justifyContent: 'space-between',
      width: 36,
      borderRightWidth: 1,
      borderRightColor: colors.BORDER,
      paddingRight: SIZES.SM,
    },
    time: {
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      color: cardTextColor,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
    },
    address: {
      fontSize: SIZES.FONT_XS,
      color: cardMutedTextColor,
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
