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
import Avatar from '../../components/Avatar';
import AvatarPicker from '../../components/AvatarPicker';
import HelpSection from '../../components/HelpSection';
import ThemeSelector from '../../components/ThemeSelector';
import OnboardingModal from '../../components/OnboardingModal';

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
  photoUrl: string | null;
  avatarType: 'photo' | 'generated' | null;
  avatarSeed: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FamilyProfile: React.FC = () => {
  const { userProfile, familyLinks, user, fetchProfile } = useAuth();
  const [linkedPatient, setLinkedPatient] = useState<LinkedPatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const fetchLinked = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Source 1: family_links
      if (familyLinks.length > 0) {
        const fileId = familyLinks[0].patient_file_id;
        const { data: file } = await supabase
          .from('patient_files')
          .select('id, patient_id, nurse_id')
          .eq('id', fileId)
          .single();

        if (file) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
            .eq('id', file.patient_id)
            .single();

          let nurseName: string | null = null;
          if (file.nurse_id) {
            const { data: nurse } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', file.nurse_id)
              .single();
            if (nurse) {
              nurseName = `${nurse.first_name} ${nurse.last_name}`;
            }
          }

          const link = familyLinks[0];
          setLinkedPatient({
            patientFileId: file.id,
            patientId: file.patient_id,
            firstName: profile?.first_name ?? 'Proche',
            lastName: profile?.last_name ?? '',
            permissions: link?.permissions ?? 'read_only',
            isManaged: false,
            nurseName,
            photoUrl: profile?.photo_url ?? null,
            avatarType: profile?.avatar_type ?? null,
            avatarSeed: profile?.avatar_seed ?? null,
          });
          setLoading(false);
          return;
        }
      }

      // Source 2: managed patient
      const { data: managedProfile } = await supabase
        .from('patient_profiles')
        .select('profile_id')
        .eq('managed_by', user.id)
        .eq('is_managed', true)
        .single();

      if (managedProfile) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
          .eq('id', managedProfile.profile_id)
          .single();

        setLinkedPatient({
          patientFileId: null,
          patientId: managedProfile.profile_id,
          firstName: profile?.first_name ?? 'Proche',
          lastName: profile?.last_name ?? '',
          permissions: 'can_message',
          isManaged: true,
          nurseName: null,
          photoUrl: profile?.photo_url ?? null,
          avatarType: profile?.avatar_type ?? null,
          avatarSeed: profile?.avatar_seed ?? null,
        });
      }

      setLoading(false);
    };

    fetchLinked();
  }, [familyLinks, user]);

  const handlePatientAvatarSaved = (patientId: string, data: { photo_url: string | null; avatar_type: 'photo' | 'generated' | null; avatar_seed: string | null }) => {
    if (linkedPatient?.patientId === patientId) {
      setLinkedPatient(prev => prev ? {
        ...prev,
        photoUrl: data.photo_url,
        avatarType: data.avatar_type,
        avatarSeed: data.avatar_seed,
      } : null);
    }
  };

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
          <Avatar
            photoUrl={userProfile?.photo_url}
            avatarType={userProfile?.avatar_type ?? null}
            avatarSeed={userProfile?.avatar_seed}
            firstName={userProfile?.first_name}
            lastName={userProfile?.last_name}
            size={80}
            backgroundColor={COLORS.FAMILY_LIGHT}
            textColor={COLORS.FAMILY_PRIMARY}
          />
          <Text style={styles.userName}>
            {userProfile?.first_name} {userProfile?.last_name}
          </Text>
          <Text style={styles.userRole}>Famille / Proche</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>

        {/* Linked patient */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proche suivi</Text>
          {linkedPatient ? (
            <View style={styles.patientRow}>
              <AvatarPicker
                photoUrl={linkedPatient.photoUrl ?? undefined}
                avatarType={linkedPatient.avatarType ?? null}
                avatarSeed={linkedPatient.avatarSeed ?? undefined}
                firstName={linkedPatient.firstName}
                lastName={linkedPatient.lastName}
                userId={user?.id ?? ''}
                targetProfileId={linkedPatient.patientId}
                compact
                onSaved={(data) => handlePatientAvatarSaved(linkedPatient.patientId, data)}
              />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{linkedPatient.firstName} {linkedPatient.lastName}</Text>
                <View style={styles.patientBadgeRow}>
                  {linkedPatient.isManaged ? (
                    <View style={[styles.badge, { backgroundColor: COLORS.FAMILY_LIGHT }]}>
                      <Text style={[styles.badgeText, { color: COLORS.FAMILY_PRIMARY }]}>Géré par vous</Text>
                    </View>
                  ) : (
                    <Text style={styles.patientPerm}>
                      {linkedPatient.permissions === 'can_message' ? 'Lecture + messagerie' : 'Lecture seule'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
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

        {/* Appearance */}
        <ThemeSelector accentColor={COLORS.FAMILY_PRIMARY} />

        {/* Help & Support */}
        <HelpSection
          userType="family"
          onRestartTutorial={() => setShowOnboarding(true)}
        />

        {/* Logout */}
        <View style={styles.logoutSection}>
          <LogoutButton variant="danger" style={styles.logoutButton} />
        </View>
      </ScrollView>

      <OnboardingModal
        visible={showOnboarding}
        userType={userProfile?.user_type ?? 'family'}
        onClose={() => setShowOnboarding(false)}
      />
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
