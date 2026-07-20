import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  supabase,
  type Profile,
  type PatientProfile,
  type Appointment,
} from '../../utils/supabase';
import { getColors, SIZES } from '../../utils/constants';
import { openNavigation } from '../../utils/navigation';
import Avatar from '../../components/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientData {
  profile: Profile;
  patientProfile: PatientProfile | null;
  managedByName: string | null;
  managedByEmail: string | null;
  managedByPhone: string | null;
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

const PatientDetail: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { patientId, patientFileId } = route.params;
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [careHistory, setCareHistory] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [removing, setRemoving] = useState(false);

  const fetchPatient = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setLoadingHistory(false);
      return;
    }

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

      // Fetch managed_by info if applicable
      let managedByName: string | null = null;
      let managedByEmail: string | null = null;
      let managedByPhone: string | null = null;
      if (pp?.managed_by) {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone')
          .eq('id', pp.managed_by)
          .single();
        if (managerProfile) {
          managedByName = `${managerProfile.first_name} ${managerProfile.last_name}`;
          managedByEmail = managerProfile.email ?? null;
          managedByPhone = managerProfile.phone ?? null;
        }
      }

      setData({
        profile: profile as Profile,
        patientProfile: (pp as PatientProfile) ?? null,
        managedByName,
        managedByEmail,
        managedByPhone,
      });
    } catch (err) {
      console.error('[PatientDetail] unexpected:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchCareHistory = useCallback(async () => {
    if (!patientId || !user) return;
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
  }, [patientId, user]);

  useFocusEffect(
    useCallback(() => {
      fetchPatient();
      fetchCareHistory();
    }, [fetchPatient, fetchCareHistory])
  );

  // -------------------------------------------------------------------------
  // Remove patient from my list
  // -------------------------------------------------------------------------

  const handleRemovePatient = () => {
    if (!patientFileId) return;

    Alert.alert(
      'Retirer ce patient',
      `Êtes-vous sûr de vouloir retirer ${data?.profile.first_name} ${data?.profile.last_name} de votre liste ?\n\nLes soins enregistrés seront conservés mais vous ne pourrez plus planifier de nouveaux rendez-vous.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              const { error } = await supabase
                .from('patient_files')
                .update({ is_active: false })
                .eq('id', patientFileId);

              if (error) {
                Alert.alert('Erreur', error.message);
                return;
              }

              navigation.goBack();
            } catch (err) {
              Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Loading
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

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.DANGER} />
          <Text style={styles.errorText}>Patient introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, patientProfile: pp, managedByName, managedByEmail, managedByPhone } = data;
  const age = calcAge(pp?.dob);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleCall = () => {
    const phone = profile?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Information', 'Aucun numéro de téléphone renseigné.');
    }
  };

  const handleItinerary = () => {
    if (pp?.gps_lat != null && pp?.gps_lng != null) {
      openNavigation(pp.gps_lat, pp.gps_lng);
    } else {
      Alert.alert('Information', "Adresse non géolocalisée. Impossible d'ouvrir l'itinéraire.");
    }
  };

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
          <Avatar
            photoUrl={profile.photo_url}
            avatarType={profile.avatar_type}
            avatarSeed={profile.avatar_seed}
            firstName={profile.first_name}
            lastName={profile.last_name}
            size={80}
          />
          <Text style={styles.profileName}>
            {profile.first_name} {profile.last_name}
          </Text>
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.SUCCESS} />
              <Text style={styles.verifiedText}>Vérifié</Text>
            </View>
          )}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow
            colors={colors}
            styles={styles}
            icon="mail-outline"
            label="Email"
            value={profile.email ?? '—'}
          />
          <InfoRow
            colors={colors}
            styles={styles}
            icon="call-outline"
            label="Téléphone"
            value={profile.phone ?? '—'}
          />
        </View>

        {/* Proche / Tuteur */}
        {managedByName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proche / Tuteur</Text>
            <InfoRow
              colors={colors}
              styles={styles}
              icon="people-outline"
              label="Nom"
              value={managedByName}
              iconColor={colors.FAMILY_PRIMARY}
            />
            {managedByPhone && (
              <InfoRow
                colors={colors}
                styles={styles}
                icon="call-outline"
                label="Téléphone"
                value={managedByPhone}
              />
            )}
            {managedByEmail && (
              <InfoRow
                colors={colors}
                styles={styles}
                icon="mail-outline"
                label="Email"
                value={managedByEmail}
              />
            )}
          </View>
        )}

        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <InfoRow
            colors={colors}
            styles={styles}
            icon="calendar-outline"
            label="Date de naissance"
            value={pp?.dob ? `${formatDate(pp.dob)}${age ? ` (${age})` : ''}` : '—'}
          />
          <InfoRow
            colors={colors}
            styles={styles}
            icon="home-outline"
            label="Adresse"
            value={pp?.address ?? '—'}
          />
          {pp?.address_label ? (
            <InfoRow
              colors={colors}
              styles={styles}
              icon="navigate-outline"
              label="Repère"
              value={pp.address_label}
            />
          ) : null}
          <InfoRow
            colors={colors}
            styles={styles}
            icon="call-outline"
            label="Contact d'urgence"
            value={pp?.emergency_contact ?? '—'}
          />
        </View>

        {/* Infos médicales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations médicales</Text>
          <InfoRow
            colors={colors}
            styles={styles}
            icon="document-text-outline"
            label="Notes"
            value={pp?.medical_notes ?? 'Aucune note'}
          />
          <InfoRow
            colors={colors}
            styles={styles}
            icon="warning-outline"
            label="Allergies"
            value={
              pp?.allergies && pp.allergies.length > 0
                ? pp.allergies.join(', ')
                : 'Aucune allergie connue'
            }
            iconColor={
              pp?.allergies && pp.allergies.length > 0 ? colors.WARNING : colors.TEXT_MUTED
            }
          />
          {pp?.access_code ? (
            <InfoRow
              colors={colors}
              styles={styles}
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
            <ActivityIndicator
              size="small"
              color={colors.NURSE_PRIMARY}
              style={{ paddingVertical: SIZES.MD }}
            />
          ) : careHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="document-text-outline" size={32} color={colors.BORDER} />
              <Text style={styles.emptyHistoryText}>Aucun soin enregistré</Text>
            </View>
          ) : (
            careHistory.map(apt => (
              <CareHistoryCard colors={colors} styles={styles} key={apt.id} appointment={apt} />
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color={colors.WHITE} />
            <Text style={styles.actionText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.INFO }]}
            onPress={handleItinerary}
          >
            <Ionicons name="navigate" size={20} color={colors.WHITE} />
            <Text style={styles.actionText}>Itinéraire</Text>
          </TouchableOpacity>
        </View>

        {/* Remove patient */}
        {patientFileId && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemovePatient}
            disabled={removing}
          >
            {removing ? (
              <ActivityIndicator size="small" color={colors.DANGER} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.DANGER} />
                <Text style={styles.removeButtonText}>Retirer de ma liste</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
  iconColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  colors: ReturnType<typeof getColors>;
  styles: ReturnType<typeof createStyles>;
  iconColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={20}
        color={iconColor ?? colors.TEXT_MUTED}
        style={styles.infoIcon}
      />
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

function CareHistoryCard({
  appointment,
  styles,
}: {
  appointment: Appointment;
  colors: ReturnType<typeof getColors>;
  styles: ReturnType<typeof createStyles>;
}) {
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
      backgroundColor: colors.NURSE_LIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SIZES.MD,
    },
    avatarText: {
      fontSize: SIZES.FONT_XL,
      fontWeight: '700',
      color: colors.NURSE_PRIMARY,
    },
    profileName: {
      fontSize: SIZES.FONT_2XL,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    verifiedText: {
      fontSize: SIZES.FONT_XS,
      color: colors.SUCCESS,
      fontWeight: '500',
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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SIZES.SM,
      paddingBottom: SIZES.SM,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    seeAllText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.NURSE_PRIMARY,
    },
    emptyHistory: {
      alignItems: 'center',
      paddingVertical: SIZES.LG,
      gap: SIZES.SM,
    },
    emptyHistoryText: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_MUTED,
    },
    careCard: {
      backgroundColor: colors.BACKGROUND,
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
      backgroundColor: colors.NURSE_LIGHT,
      paddingHorizontal: SIZES.SM,
      paddingVertical: 2,
      borderRadius: SIZES.BORDER_RADIUS_FULL,
    },
    careTypeText: {
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      color: colors.NURSE_PRIMARY,
    },
    careDate: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
    },
    careNote: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
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
      color: colors.TEXT_MUTED,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
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
      backgroundColor: colors.NURSE_PRIMARY,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      gap: SIZES.SM,
    },
    actionText: {
      color: colors.WHITE,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
    // Remove button
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.SM,
      marginTop: SIZES.MD,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
      borderColor: colors.DANGER,
      backgroundColor: colors.WHITE,
    },
    removeButtonText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.DANGER,
    },
  });
}

export default PatientDetail;
