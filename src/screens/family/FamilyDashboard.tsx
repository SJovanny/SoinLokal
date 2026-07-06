import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import LogoutButton from '../../components/LogoutButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedPatient {
  patientFileId: string | null;
  patientId: string;
  firstName: string;
  lastName: string;
  permissions: 'read_only' | 'can_message';
  isManaged: boolean;
  nurseName: string | null;
  nurseId: string | null;
}

interface UpcomingAppointment {
  id: string;
  nurseName: string;
  date: string;
  time: string;
  careType: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface RecentCare {
  id: string;
  nurseName: string;
  date: string;
  careType: string;
  carePerformed?: string;
}

interface Stats {
  upcomingRDV: number;
  recentCares: number;
  unreadMessages: number;
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
  confirmed: { color: COLORS.FAMILY_PRIMARY, label: 'Confirmé' },
  completed: { color: COLORS.TEXT_MUTED, label: 'Terminé' },
  cancelled: { color: COLORS.DANGER, label: 'Annulé' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FamilyDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { userProfile, user, familyLinks, fetchProfile } = useAuth();
  const today = getTodayISO();

  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [stats, setStats] = useState<Stats>({ upcomingRDV: 0, recentCares: 0, unreadMessages: 0 });
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [recentCares, setRecentCares] = useState<RecentCare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch all patients this family member is linked to
  // 1. Via family_links (traditional: patient has an auth account + patient_file)
  // 2. Via patient_profiles.managed_by (managed: shadow account, no patient_file yet)
  // -------------------------------------------------------------------------

  const fetchLinkedPatients = useCallback(async () => {
    if (!user) return;

    const patients: LinkedPatient[] = [];

    // --- Source 1: family_links (existing patients with patient_files) ---
    if (familyLinks.length > 0) {
      const fileIds = familyLinks.map(l => l.patient_file_id);

      const { data: files } = await supabase
        .from('patient_files')
        .select('id, patient_id, nurse_id')
        .in('id', fileIds);

      if (files && files.length > 0) {
        const patientIds = files.map((f: any) => f.patient_id);
        const nurseIds = [...new Set(files.map((f: any) => f.nurse_id).filter(Boolean))];

        // Fetch patient names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', patientIds);

        const profileMap: Record<string, { firstName: string; lastName: string }> = {};
        (profiles ?? []).forEach((p: any) => {
          profileMap[p.id] = { firstName: p.first_name, lastName: p.last_name };
        });

        // Fetch nurse names
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

        files.forEach((f: any) => {
          const link = familyLinks.find(l => l.patient_file_id === f.id);
          const profile = profileMap[f.patient_id];
          patients.push({
            patientFileId: f.id,
            patientId: f.patient_id,
            firstName: profile?.firstName ?? 'Proche',
            lastName: profile?.lastName ?? '',
            permissions: link?.permissions ?? 'read_only',
            isManaged: false,
            nurseName: nurseMap[f.nurse_id] ?? null,
            nurseId: f.nurse_id ?? null,
          });
        });
      }
    }

    // --- Source 2: managed patients (via patient_profiles.managed_by) ---
    const { data: managedProfiles } = await supabase
      .from('patient_profiles')
      .select('profile_id')
      .eq('managed_by', user.id)
      .eq('is_managed', true);

    if (managedProfiles && managedProfiles.length > 0) {
      const managedIds = managedProfiles.map((p: any) => p.profile_id);

      // Avoid duplicates (a managed patient could also be in family_links)
      const existingIds = new Set(patients.map(p => p.patientId));
      const newManagedIds = managedIds.filter((id: string) => !existingIds.has(id));

      if (newManagedIds.length > 0) {
        // Fetch patient names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', newManagedIds);

        // Check if any of these managed patients already have a patient_file
        const { data: existingFiles } = await supabase
          .from('patient_files')
          .select('id, patient_id, nurse_id')
          .in('patient_id', newManagedIds);

        const fileMap: Record<string, { fileId: string; nurseName: string; nurseId: string }> = {};
        if (existingFiles) {
          const nurseIds = [...new Set(existingFiles.map((f: any) => f.nurse_id).filter(Boolean))];
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
          existingFiles.forEach((f: any) => {
            fileMap[f.patient_id] = {
              fileId: f.id,
              nurseName: nurseMap[f.nurse_id] ?? 'Infirmière',
              nurseId: f.nurse_id,
            };
          });
        }

        (profiles ?? []).forEach((p: any) => {
          const fileInfo = fileMap[p.id];
          patients.push({
            patientFileId: fileInfo?.fileId ?? null,
            patientId: p.id,
            firstName: p.first_name ?? 'Proche',
            lastName: p.last_name ?? '',
            permissions: 'can_message',
            isManaged: true,
            nurseName: fileInfo?.nurseName ?? null,
            nurseId: fileInfo?.nurseId ?? null,
          });
        });
      }
    }

    setLinkedPatients(patients);
  }, [user, familyLinks]);

  // -------------------------------------------------------------------------
  // Fetch data (only for patients with patient_files)
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user) return;

    const fileIds = linkedPatients
      .filter(p => p.patientFileId != null)
      .map(p => p.patientFileId as string);

    if (fileIds.length === 0) {
      setStats({ upcomingRDV: 0, recentCares: 0, unreadMessages: 0 });
      return;
    }

    try {
      // Stats
      const { count: upcomingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('patient_file_id', fileIds)
        .gte('date', today);

      const { count: recentCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('patient_file_id', fileIds)
        .eq('status', 'completed');

      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('patient_file_id', fileIds)
        .eq('is_read', false)
        .neq('author_id', user.id);

      setStats({
        upcomingRDV: upcomingCount ?? 0,
        recentCares: recentCount ?? 0,
        unreadMessages: msgCount ?? 0,
      });

      // Upcoming appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, nurse_id, date, time, care_type, status')
        .in('patient_file_id', fileIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);

      // Nurse names
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

      setAppointments(
        (appts ?? []).map((a: any) => ({
          id: a.id,
          nurseName: nurseMap[a.nurse_id] ?? 'Infirmière',
          date: a.date,
          time: a.time,
          careType: a.care_type,
          status: a.status,
        }))
      );

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
      console.error('[FamilyDashboard] unexpected:', err);
    }
  }, [user, linkedPatients, today]);

  useEffect(() => {
    setLoading(true);
    fetchLinkedPatients()
      .then(() => {})
      .finally(() => setLoading(false));
  }, [fetchLinkedPatients]);

  useEffect(() => {
    if (linkedPatients.length > 0) {
      fetchData();
    }
  }, [linkedPatients, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile(user!.id);
    await fetchLinkedPatients();
    setRefreshing(false);
  }, [fetchProfile, fetchLinkedPatients, user]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const renderAppointment = ({ item }: { item: UpcomingAppointment }) => {
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    return (
      <View style={styles.appointmentCard}>
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
      </View>
    );
  };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.FAMILY_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (linkedPatients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{userProfile?.first_name} {userProfile?.last_name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.addProcheBtn}
              onPress={() => navigation.navigate('AddManagedPatient')}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.FAMILY_PRIMARY} />
            </TouchableOpacity>
            <LogoutButton variant="icon" showText={false} />
          </View>
        </View>
        <View style={styles.centerWrap}>
          <Ionicons name="people-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun proche associé</Text>
          <Text style={styles.emptySubtitle}>
            Votre compte famille n'est encore lié à aucun patient.{'\n'}
            Ajoutez un proche ou contactez l'équipe soignante.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => navigation.navigate('AddManagedPatient')}
          >
            <Ionicons name="person-add-outline" size={18} color={COLORS.WHITE} />
            <Text style={styles.emptyAddBtnText}>Ajouter un proche</Text>
          </TouchableOpacity>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.FAMILY_PRIMARY]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{userProfile?.first_name} {userProfile?.last_name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.addProcheBtn}
              onPress={() => navigation.navigate('AddManagedPatient')}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.FAMILY_PRIMARY} />
            </TouchableOpacity>
            <LogoutButton variant="icon" showText={false} />
          </View>
        </View>

        {/* Patient cards */}
        {linkedPatients.map((patient) => (
          <View key={patient.patientId} style={styles.patientCard}>
            <View style={styles.patientCardHeader}>
              <Ionicons name="heart" size={20} color={COLORS.FAMILY_PRIMARY} />
              <Text style={styles.patientCardTitle}>
                {patient.isManaged ? 'Proche géré' : 'Suivi de votre proche'}
              </Text>
            </View>
            <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
            {patient.isManaged ? (
              patient.nurseName ? (
                <TouchableOpacity
                  style={styles.nurseStatusRow}
                  onPress={() => navigation.navigate('NurseProfileView', { nurseId: patient.nurseId })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
                  <Text style={styles.nurseStatusText}>Suivi par {patient.nurseName}</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.SUCCESS} />
                </TouchableOpacity>
              ) : (
                <View style={styles.nurseStatusRow}>
                  <Ionicons name="time-outline" size={16} color={COLORS.WARNING} />
                  <Text style={[styles.nurseStatusText, { color: COLORS.WARNING }]}>
                    En attente d'infirmière
                  </Text>
                </View>
              )
            ) : (
              <Text style={styles.patientPermission}>
                {patient.permissions === 'can_message' ? 'Accès lecture + messagerie' : 'Accès lecture seule'}
              </Text>
            )}
          </View>
        ))}

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.upcomingRDV}</Text>
              <Text style={styles.statLabel}>Prochains RDV</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.recentCares}</Text>
              <Text style={styles.statLabel}>Soins reçus</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, stats.unreadMessages > 0 && { color: COLORS.WARNING }]}>
                {stats.unreadMessages}
              </Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>
        </View>

        {/* Upcoming appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochains rendez-vous</Text>
          {appointments.length > 0 ? (
            <FlatList
              data={appointments}
              renderItem={renderAppointment}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.BORDER} />
              <Text style={styles.emptySectionText}>Aucun rendez-vous à venir</Text>
            </View>
          )}
        </View>

        {/* Recent cares */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derniers soins</Text>
          {recentCares.length > 0 ? (
            <FlatList
              data={recentCares}
              renderItem={renderRecentCare}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.BORDER} />
              <Text style={styles.emptySectionText}>Aucun soin récent</Text>
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
    gap: SIZES.MD,
    paddingHorizontal: SIZES.XXL,
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
  addProcheBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.FAMILY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Patient card
  patientCard: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: SIZES.LG,
    marginTop: SIZES.MD,
    padding: SIZES.LG,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.FAMILY_PRIMARY,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  patientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.SM,
    gap: SIZES.SM,
  },
  patientCardTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  patientName: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.FAMILY_PRIMARY,
  },
  patientPermission: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    marginTop: SIZES.XS,
  },
  nurseStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.XS,
    marginTop: SIZES.XS,
  },
  nurseStatusText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  // Stats
  statsCard: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: SIZES.LG,
    marginTop: SIZES.MD,
    marginBottom: SIZES.LG,
    padding: SIZES.LG,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.FAMILY_PRIMARY,
  },
  statLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: SIZES.XS,
  },
  // Sections
  section: {
    paddingHorizontal: SIZES.LG,
    marginBottom: SIZES.LG,
  },
  sectionTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SIZES.MD,
  },
  emptySection: {
    alignItems: 'center',
    padding: SIZES.XXL,
    gap: SIZES.SM,
  },
  emptySectionText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_MUTED,
  },
  // Appointment cards
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
  // Care cards
  careCard: {
    backgroundColor: COLORS.WHITE,
    padding: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginBottom: SIZES.SM,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.FAMILY_LIGHT,
    shadowColor: COLORS.BLACK,
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
    color: COLORS.FAMILY_PRIMARY,
  },
  careDate: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
  careNurse: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.XS,
  },
  careNote: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  // Empty state
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.FAMILY_PRIMARY,
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    gap: SIZES.SM,
    marginTop: SIZES.MD,
  },
  emptyAddBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
});

export default FamilyDashboard;
