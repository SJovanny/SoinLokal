import React, { useState, useEffect, useMemo } from 'react';
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
import { getColors, SIZES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';
import Avatar from '../../components/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NurseData {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  rppsNumber: string | null;
  specialties: string[];
  zone: string | null;
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
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          .select('rpps_number, specialties, zone')
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
          rppsNumber: np?.rpps_number ?? null,
          specialties: np?.specialties ?? [],
          zone: np?.zone ?? null,
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
          <ActivityIndicator size="large" color={colors.FAMILY_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.DANGER} />
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
          <Ionicons name="chevron-back" size={24} color={colors.TEXT_PRIMARY} />
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
            backgroundColor={colors.FAMILY_LIGHT}
            textColor={colors.FAMILY_PRIMARY}
          />
          <Text style={styles.profileName}>
            {data.firstName} {data.lastName}
          </Text>
          <Text style={styles.profileRole}>Infirmière libérale</Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow colors={colors} styles={styles} icon="mail-outline" label="Email" value={data.email ?? '—'} />
          <InfoRow colors={colors} styles={styles} icon="call-outline" label="Téléphone" value={data.phone ?? '—'} />
        </View>

        {/* Professional info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations professionnelles</Text>
          <InfoRow colors={colors} styles={styles} icon="id-card-outline" label="N° RPPS" value={data.rppsNumber ?? '—'} />
          <InfoRow colors={colors} styles={styles} icon="map-outline" label="Zone d'intervention" value={data.zone ?? '—'} />
          {data.specialties.length > 0 && (
            <InfoRow colors={colors} styles={styles} icon="medical-outline" label="Spécialités" value={data.specialties.join(', ')} />
          )}
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
  colors,
  styles,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  colors: ReturnType<typeof getColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.TEXT_MUTED} style={styles.infoIcon} />
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
    gap: SIZES.MD,
  },
  errorText: {
    fontSize: SIZES.FONT_MD,
    color: colors.TEXT_SECONDARY,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: colors.TEXT_PRIMARY,
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
    backgroundColor: colors.FAMILY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.MD,
  },
  avatarText: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: colors.FAMILY_PRIMARY,
  },
  profileName: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: colors.TEXT_PRIMARY,
  },
  profileRole: {
    fontSize: SIZES.FONT_SM,
    color: colors.FAMILY_PRIMARY,
    fontWeight: '600',
    marginTop: 4,
  },
  // Sections
  section: {
    backgroundColor: colors.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.MD,
    shadowColor: colors.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: colors.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.SM,
    paddingBottom: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
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
    color: colors.TEXT_MUTED,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: SIZES.FONT_MD,
    color: colors.TEXT_PRIMARY,
    fontWeight: '500',
  },
  });
}

export default NurseProfileView;
