import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import Avatar from '../../components/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NurseData {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  adeli: string | null;
  specialties: string[];
  zone: string | null;
  rating: number;
  totalPatients: number;
  totalVisits: number;
  photoUrl: string | null;
  avatarType: 'photo' | 'generated' | null;
  avatarSeed: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NurseProfileView: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { nurseId } = route.params;
  const [data, setData] = useState<NurseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nurseId) {
      setLoading(false);
      return;
    }

    const fetchNurse = async () => {
      setLoading(true);
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone, photo_url, avatar_type, avatar_seed')
          .eq('id', nurseId)
          .single();

        if (profileErr) {
          console.error('[NurseProfileView] profile error:', profileErr.message);
          return;
        }

        const { data: np, error: npErr } = await supabase
          .from('nurse_profiles')
          .select('adeli, specialties, zone, rating, total_patients, total_visits')
          .eq('profile_id', nurseId)
          .single();

        if (npErr && npErr.code !== 'PGRST116') {
          console.error('[NurseProfileView] nurse_profiles error:', npErr.message);
        }

        setData({
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          email: profile.email ?? null,
          phone: profile.phone ?? null,
          adeli: np?.adeli ?? null,
          specialties: np?.specialties ?? [],
          zone: np?.zone ?? null,
          rating: np?.rating ?? 0,
          totalPatients: np?.total_patients ?? 0,
          totalVisits: np?.total_visits ?? 0,
          photoUrl: profile.photo_url ?? null,
          avatarType: profile.avatar_type ?? null,
          avatarSeed: profile.avatar_seed ?? null,
        });
      } catch (err) {
        console.error('[NurseProfileView] unexpected:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNurse();
  }, [nurseId]);

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.FAMILY_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.DANGER} />
          <Text style={styles.errorText}>Infirmière introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render
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
        <Text style={styles.headerTitle}>Infirmière</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.profileHeader}>
          <Avatar
            photoUrl={data.photoUrl ?? undefined}
            avatarType={data.avatarType}
            avatarSeed={data.avatarSeed ?? undefined}
            firstName={data.firstName}
            lastName={data.lastName}
            size={80}
            backgroundColor={COLORS.FAMILY_LIGHT}
            textColor={COLORS.FAMILY_PRIMARY}
          />
          <Text style={styles.profileName}>
            {data.firstName} {data.lastName}
          </Text>
          <Text style={styles.profileRole}>Infirmière libérale</Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow icon="mail-outline" label="Email" value={data.email ?? '—'} />
          <InfoRow icon="call-outline" label="Téléphone" value={data.phone ?? '—'} />
        </View>

        {/* Professional info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations professionnelles</Text>
          <InfoRow icon="id-card-outline" label="N° ADELI" value={data.adeli ?? '—'} />
          <InfoRow icon="map-outline" label="Zone d'intervention" value={data.zone ?? '—'} />
          {data.specialties.length > 0 && (
            <InfoRow icon="medical-outline" label="Spécialités" value={data.specialties.join(', ')} />
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.totalPatients}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.totalVisits}</Text>
              <Text style={styles.statLabel}>Visites</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{data.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// InfoRow sub-component
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={COLORS.TEXT_MUTED} style={styles.infoIcon} />
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

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
  },
  errorText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_SECONDARY,
  },
  // Header
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
  headerTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: SIZES.XL,
    paddingTop: SIZES.MD,
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
  profileName: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  profileRole: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.FAMILY_PRIMARY,
    fontWeight: '600',
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.SM,
    paddingBottom: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.SM,
  },
  infoIcon: {
    marginRight: SIZES.MD,
    width: 24,
    textAlign: 'center',
  },
  infoTextBlock: {
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
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SIZES.SM,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.FAMILY_PRIMARY,
  },
  statLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
});

export default NurseProfileView;
