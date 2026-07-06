import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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

interface LinkedPatientInfo {
  patientFileId: string | null;
  patientId: string;
  firstName: string;
  lastName: string;
  permissions: 'read_only' | 'can_message';
  isManaged: boolean;
  nurseName: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FamilyProfile: React.FC = () => {
  const { userProfile, familyLinks, user } = useAuth();
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinked = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const patients: LinkedPatientInfo[] = [];

      // Source 1: family_links
      if (familyLinks.length > 0) {
        const fileIds = familyLinks.map(l => l.patient_file_id);
        const { data: files } = await supabase
          .from('patient_files')
          .select('id, patient_id, nurse_id')
          .in('id', fileIds);

        if (files && files.length > 0) {
          const patientIds = files.map((f: any) => f.patient_id);
          const nurseIds = [...new Set(files.map((f: any) => f.nurse_id).filter(Boolean))];

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', patientIds);

          const profileMap: Record<string, { firstName: string; lastName: string }> = {};
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.id] = { firstName: p.first_name, lastName: p.last_name };
          });

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
            });
          });
        }
      }

      // Source 2: managed patients
      const { data: managedProfiles } = await supabase
        .from('patient_profiles')
        .select('profile_id')
        .eq('managed_by', user.id)
        .eq('is_managed', true);

      if (managedProfiles && managedProfiles.length > 0) {
        const existingIds = new Set(patients.map(p => p.patientId));
        const managedIds = managedProfiles
          .map((p: any) => p.profile_id)
          .filter((id: string) => !existingIds.has(id));

        if (managedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', managedIds);

          (profiles ?? []).forEach((p: any) => {
            patients.push({
              patientFileId: null,
              patientId: p.id,
              firstName: p.first_name ?? 'Proche',
              lastName: p.last_name ?? '',
              permissions: 'can_message',
              isManaged: true,
              nurseName: null,
            });
          });
        }
      }

      setLinkedPatients(patients);
      setLoading(false);
    };

    fetchLinked();
  }, [familyLinks, user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.FAMILY_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.userName}>
            {userProfile?.first_name} {userProfile?.last_name}
          </Text>
          <Text style={styles.userRole}>Famille / Proche</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Linked patients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proche(s) suivi(s)</Text>
          {linkedPatients.length > 0 ? (
            linkedPatients.map((p) => (
              <View key={p.patientId} style={styles.patientRow}>
                <Ionicons name="person-outline" size={20} color={COLORS.FAMILY_PRIMARY} />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{p.firstName} {p.lastName}</Text>
                  <View style={styles.patientBadgeRow}>
                    {p.isManaged ? (
                      <View style={[styles.badge, { backgroundColor: COLORS.FAMILY_LIGHT }]}>
                        <Text style={[styles.badgeText, { color: COLORS.FAMILY_PRIMARY }]}>Géré par vous</Text>
                      </View>
                    ) : (
                      <Text style={styles.patientPerm}>
                        {p.permissions === 'can_message' ? 'Lecture + messagerie' : 'Lecture seule'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={COLORS.BORDER} />
              <Text style={styles.emptyText}>Aucun proche associé</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.TEXT_MUTED} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userProfile?.email}</Text>
            </View>
          </View>
          {userProfile?.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.TEXT_MUTED} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{userProfile.phone}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <LogoutButton variant="danger" style={styles.logoutButton} />
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
  header: {
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.FAMILY_PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Profile card
  profileCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    padding: SIZES.XL,
    alignItems: 'center',
    marginBottom: SIZES.MD,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.FAMILY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.MD,
  },
  avatarText: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.FAMILY_PRIMARY,
  },
  userName: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  userRole: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.FAMILY_PRIMARY,
    fontWeight: '600',
    marginTop: 2,
  },
  userEmail: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  // Sections
  section: {
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
  sectionTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SIZES.MD,
  },
  // Patient rows
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  patientPerm: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  patientBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.XL,
    gap: SIZES.SM,
  },
  emptyText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_MUTED,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.MD,
  },
  infoContent: {
    marginLeft: SIZES.MD,
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  // Logout
  logoutSection: {
    paddingVertical: SIZES.XL,
    alignItems: 'center',
  },
  logoutButton: {
    minWidth: 200,
  },
});

export default FamilyProfile;
