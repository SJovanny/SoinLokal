import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Profile, type PatientProfile, type Appointment } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientData {
  profile: Profile;
  patientProfile: PatientProfile | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Non renseigné';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function calcAge(dob: string | undefined): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} ans`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PatientDetail: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { patientId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [careHistory, setCareHistory] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      setLoadingHistory(false);
      return;
    }

    const fetchPatient = async () => {
      setLoading(true);
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', patientId)
          .single();

        if (profileErr) {
          console.error('[PatientDetail] profile error:', profileErr.message);
          return;
        }

        const { data: pp, error: ppErr } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('profile_id', patientId)
          .single();

        if (ppErr && ppErr.code !== 'PGRST116') {
          console.error('[PatientDetail] patient_profiles error:', ppErr.message);
        }

        setData({
          profile: profile as Profile,
          patientProfile: (pp as PatientProfile) ?? null,
        });
      } catch (err) {
        console.error('[PatientDetail] unexpected:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchCareHistory = async () => {
      if (!user) return;
      setLoadingHistory(true);
      try {
        const { data: file } = await supabase
          .from('patient_files')
          .select('id')
          .eq('patient_id', patientId)
          .eq('nurse_id', user.id)
          .single();

        if (!file) {
          setCareHistory([]);
          return;
        }

        const { data: history, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_file_id', file.id)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .limit(5);

        if (error) {
          console.error('[PatientDetail] history error:', error.message);
          return;
        }

        setCareHistory((history as Appointment[]) ?? []);
      } catch (err) {
        console.error('[PatientDetail] history unexpected:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPatient();
    fetchCareHistory();
  }, [patientId, user]);

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.DANGER} />
          <Text style={styles.errorText}>Patient introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, patientProfile: pp } = data;
  const age = calcAge(pp?.dob);

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
        <Text style={styles.headerTitle}>Fiche patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.first_name?.[0]}
              {profile.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {profile.first_name} {profile.last_name}
          </Text>
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.SUCCESS} />
              <Text style={styles.verifiedText}>Vérifié</Text>
            </View>
          )}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow icon="mail-outline" label="Email" value={profile.email ?? '—'} />
          <InfoRow icon="call-outline" label="Téléphone" value={profile.phone ?? '—'} />
        </View>

        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <InfoRow
            icon="calendar-outline"
            label="Date de naissance"
            value={pp?.dob ? `${formatDate(pp.dob)}${age ? ` (${age})` : ''}` : '—'}
          />
          <InfoRow
            icon="home-outline"
            label="Adresse"
            value={pp?.address ?? '—'}
          />
          {pp?.address_label ? (
            <InfoRow
              icon="navigate-outline"
              label="Repère"
              value={pp.address_label}
            />
          ) : null}
          <InfoRow
            icon="call-outline"
            label="Contact d'urgence"
            value={pp?.emergency_contact ?? '—'}
          />
        </View>

        {/* Infos médicales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations médicales</Text>
          <InfoRow
            icon="document-text-outline"
            label="Notes"
            value={pp?.medical_notes ?? 'Aucune note'}
          />
          <InfoRow
            icon="warning-outline"
            label="Allergies"
            value={
              pp?.allergies && pp.allergies.length > 0
                ? pp.allergies.join(', ')
                : 'Aucune allergie connue'
            }
            iconColor={
              pp?.allergies && pp.allergies.length > 0
                ? COLORS.WARNING
                : COLORS.TEXT_MUTED
            }
          />
          {pp?.access_code ? (
            <InfoRow
              icon="keypad-outline"
              label="Code d'accès"
              value={pp.access_code}
            />
          ) : null}
        </View>

        {/* Soins réalisés */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Soins réalisés</Text>
            {careHistory.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('CareHistory', {
                    patientId,
                    patientName: `${profile.first_name} ${profile.last_name}`,
                  })
                }
              >
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingHistory ? (
            <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} style={{ paddingVertical: SIZES.MD }} />
          ) : careHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="document-text-outline" size={32} color={COLORS.BORDER} />
              <Text style={styles.emptyHistoryText}>Aucun soin enregistré</Text>
            </View>
          ) : (
            careHistory.map((apt) => <CareHistoryCard key={apt.id} appointment={apt} />)
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="call" size={20} color={COLORS.WHITE} />
            <Text style={styles.actionText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.INFO }]}
          >
            <Ionicons name="navigate" size={20} color={COLORS.WHITE} />
            <Text style={styles.actionText}>Itinéraire</Text>
          </TouchableOpacity>
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
  iconColor = COLORS.TEXT_MUTED,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatCareDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CareHistoryCard({ appointment }: { appointment: Appointment }) {
  return (
    <View style={styles.careCard}>
      <View style={styles.careCardHeader}>
        <View style={styles.careTypeBadge}>
          <Text style={styles.careTypeText}>{appointment.care_type}</Text>
        </View>
        <Text style={styles.careDate}>
          {formatCareDate(appointment.date)}
          {appointment.time ? ` · ${appointment.time.substring(0, 5)}` : ''}
        </Text>
      </View>
      {appointment.care_performed ? (
        <Text style={styles.careNote} numberOfLines={2}>
          {appointment.care_performed}
        </Text>
      ) : null}
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
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.MD,
  },
  avatarText: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  profileName: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.SUCCESS,
    fontWeight: '500',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.SM,
    paddingBottom: SIZES.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  seeAllText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.NURSE_PRIMARY,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: SIZES.LG,
    gap: SIZES.SM,
  },
  emptyHistoryText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
  },
  careCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    marginBottom: SIZES.SM,
  },
  careCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  careTypeBadge: {
    backgroundColor: COLORS.NURSE_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  careTypeText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
    color: COLORS.NURSE_PRIMARY,
  },
  careDate: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
  careNote: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
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
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SIZES.MD,
    marginTop: SIZES.SM,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    gap: SIZES.SM,
  },
  actionText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
});

export default PatientDetail;
