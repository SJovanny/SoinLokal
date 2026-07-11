import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Profile, type PatientProfile } from '../../utils/supabase';
import { COLORS, SIZES } from '../../utils/constants';
import Avatar from '../../components/Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientWithProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  patient_profiles: PatientProfile | null;
  managed_by_name?: string | null;
}

interface MyPatient {
  id: string; // patient_files.id
  patient_id: string;
  patient: PatientWithProfile;
}

type TabKey = 'mes-patients' | 'recherche';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcAge(dob: string | undefined): string | null {
  if (!dob) return null;
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

const PatientsList: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const searchRef = useRef<TextInput>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('mes-patients');
  const [myPatients, setMyPatients] = useState<MyPatient[]>([]);
  const [searchResults, setSearchResults] = useState<PatientWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Derived set of patient IDs already added
  const myPatientIds = new Set(myPatients.map((p) => p.patient_id));

  // -------------------------------------------------------------------------
  // Load my patients
  // -------------------------------------------------------------------------

  const loadMyPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Step 1: Fetch patient_files with basic profile info
      const { data, error } = await supabase
        .from('patient_files')
        .select(`
          id,
          patient_id,
          patient:profiles!patient_id(id, first_name, last_name, email, phone)
        `)
        .eq('nurse_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PatientsList] loadMyPatients error:', error.message);
        return;
      }

      // Step 2: Fetch patient_profiles separately
      const patientIds = (data ?? []).map((row: any) => row.patient_id).filter(Boolean);
      let ppMap: Record<string, any> = {};
      let managedByMap: Record<string, string> = {}; // managed_by id -> name
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('patient_profiles')
          .select('id, profile_id, dob, address, address_label, emergency_contact, medical_notes, allergies, is_managed, managed_by, created_at, updated_at')
          .in('profile_id', patientIds);
        (profiles ?? []).forEach((pp: any) => { ppMap[pp.profile_id] = pp; });

        // Fetch managed_by names (family members)
        const managedByIds = [...new Set((profiles ?? []).map((pp: any) => pp.managed_by).filter(Boolean))];
        if (managedByIds.length > 0) {
          const { data: familyProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', managedByIds);
          (familyProfiles ?? []).forEach((fp: any) => {
            managedByMap[fp.id] = `${fp.first_name} ${fp.last_name}`;
          });
        }
      }

      // Step 3: Merge
      const mapped: MyPatient[] = (data ?? []).map((row: any) => {
        const patient = Array.isArray(row.patient)
          ? row.patient[0] ?? null
          : row.patient ?? null;
        const pp = ppMap[row.patient_id] ?? null;
        return {
          id: row.id,
          patient_id: row.patient_id,
          patient: {
            ...patient,
            patient_profiles: pp,
            managed_by_name: pp?.managed_by ? managedByMap[pp.managed_by] ?? null : null,
          },
        };
      });

      setMyPatients(mapped);
    } catch (err) {
      console.error('[PatientsList] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyPatients();
  }, [loadMyPatients]);

  // -------------------------------------------------------------------------
  // Open search mode if param passed from dashboard
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (route.params?.openSearch) {
      setActiveTab('recherche');
      setTimeout(() => searchRef.current?.focus(), 300);
      navigation.setParams({ openSearch: false });
    }
  }, [route.params?.openSearch]);

  // -------------------------------------------------------------------------
  // Search patients
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (activeTab !== 'recherche') return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = searchQuery.trim();
        // Step 1: Search profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .eq('user_type', 'patient')
          .or(
            `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
          )
          .limit(20);

        if (error) {
          console.error('[PatientsList] search error:', error.message);
          return;
        }

        // Step 2: Fetch patient_profiles separately
        const ids = (data ?? []).map((r: any) => r.id);
        let ppMap: Record<string, any> = {};
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from('patient_profiles')
            .select('id, profile_id, dob, address, address_label, emergency_contact, medical_notes, allergies, created_at, updated_at')
            .in('profile_id', ids);
          (profiles ?? []).forEach((pp: any) => { ppMap[pp.profile_id] = pp; });
        }

        // Step 3: Merge
        const mapped: PatientWithProfile[] = (data ?? []).map((row: any) => ({
          ...row,
          patient_profiles: ppMap[row.id] ?? null,
        }));

        setSearchResults(mapped);
      } catch (err) {
        console.error('[PatientsList] search unexpected:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // -------------------------------------------------------------------------
  // Add patient to my list
  // -------------------------------------------------------------------------

  const handleAddPatient = async (patientId: string) => {
    if (!user) return;
    setAddingId(patientId);
    Keyboard.dismiss();
    try {
      const { error } = await supabase.from('patient_files').insert({
        patient_id: patientId,
        nurse_id: user.id,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'Ce patient est déjà dans votre liste.');
        } else {
          Alert.alert('Erreur', error.message);
        }
        return;
      }

      await loadMyPatients();
      Alert.alert('Succès', 'Patient ajouté à votre liste.');
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setAddingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Render patient card
  // -------------------------------------------------------------------------

  const renderPatientCard = (
    patient: PatientWithProfile,
    opts?: { showAddButton?: boolean; showAddedBadge?: boolean }
  ) => {
    const pp = patient.patient_profiles;
    const age = calcAge(pp?.dob);
    const isAdded = myPatientIds.has(patient.id);
    const isAdding = addingId === patient.id;

    return (
      <TouchableOpacity
        key={patient.id}
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          // Find the patient_file id if it's in my list
          const mine = myPatients.find((p) => p.patient_id === patient.id);
          navigation.navigate('PatientDetail', {
            patientId: patient.id,
            patientFileId: mine?.id ?? null,
          });
        }}
      >
        <View style={styles.cardAvatar}>
          <Avatar
            photoUrl={(patient as any).photo_url}
            avatarType={(patient as any).avatar_type}
            avatarSeed={(patient as any).avatar_seed}
            firstName={patient.first_name}
            lastName={patient.last_name}
            size={48}
          />
        </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>
              {patient.first_name} {patient.last_name}
            </Text>
            {patient.managed_by_name ? (
              <View style={styles.managedBadge}>
                <Ionicons name="people-outline" size={12} color={COLORS.FAMILY_PRIMARY} />
                <Text style={styles.managedBadgeText}>Géré par {patient.managed_by_name}</Text>
              </View>
            ) : null}
            {pp?.address ? (
            <View style={styles.cardMetaRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.TEXT_MUTED} />
              <Text style={styles.cardMeta} numberOfLines={1}>
                {pp.address}
              </Text>
            </View>
          ) : null}
          {age ? (
            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.TEXT_MUTED} />
              <Text style={styles.cardMeta}>{age}</Text>
            </View>
          ) : null}
          {patient.phone ? (
            <View style={styles.cardMetaRow}>
              <Ionicons name="call-outline" size={14} color={COLORS.TEXT_MUTED} />
              <Text style={styles.cardMeta}>{patient.phone}</Text>
            </View>
          ) : null}
        </View>

        {opts?.showAddButton ? (
          isAdded ? (
            <View style={styles.addedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
              <Text style={styles.addedBadgeText}>Ajouté</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddPatient(patient.id)}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color={COLORS.WHITE} />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          )
        ) : (
          <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
        )}
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Tab content
  // -------------------------------------------------------------------------

  const renderMesPatients = () => {
    if (loading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
        </View>
      );
    }

    if (myPatients.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun patient</Text>
          <Text style={styles.emptySubtitle}>
            Recherchez un patient pour l'ajouter à votre liste.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              setActiveTab('recherche');
              setTimeout(() => searchRef.current?.focus(), 200);
            }}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.WHITE} />
            <Text style={styles.emptyButtonText}>Rechercher un patient</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={myPatients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderPatientCard(item.patient)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const renderRecherche = () => (
    <View style={styles.searchContainer}>
      {/* Search input */}
      <View style={styles.searchInputWrap}>
        <Ionicons
          name="search-outline"
          size={20}
          color={COLORS.TEXT_MUTED}
          style={styles.searchIcon}
        />
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Nom, prénom ou email..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {searching ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} />
        </View>
      ) : searchQuery.trim().length < 2 ? (
        <View style={styles.searchHint}>
          <Ionicons name="search-outline" size={40} color={COLORS.BORDER} />
          <Text style={styles.searchHintText}>
            Tapez au moins 2 caractères pour rechercher
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptySubtitle}>
            Aucun patient trouvé pour "{searchQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            renderPatientCard(item, { showAddButton: true })
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients</Text>
        {activeTab === 'mes-patients' && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setActiveTab('recherche');
              setTimeout(() => searchRef.current?.focus(), 200);
            }}
          >
            <Ionicons name="person-add-outline" size={22} color={COLORS.NURSE_PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mes-patients' && styles.tabActive]}
          onPress={() => setActiveTab('mes-patients')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'mes-patients' && styles.tabTextActive,
            ]}
          >
            Mes patients ({myPatients.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recherche' && styles.tabActive]}
          onPress={() => {
            setActiveTab('recherche');
            setTimeout(() => searchRef.current?.focus(), 200);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'recherche' && styles.tabTextActive,
            ]}
          >
            Recherche
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'mes-patients' ? renderMesPatients() : renderRecherche()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.MD,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.NURSE_PRIMARY,
  },
  tabText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '500',
    color: COLORS.TEXT_MUTED,
  },
  tabTextActive: {
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  // List
  listContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.SM,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.MD,
  },
  cardInfo: {
    flex: 1,
    marginRight: SIZES.SM,
  },
  cardName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardMeta: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 6,
    flex: 1,
  },
  // Managed badge
  managedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: COLORS.FAMILY_LIGHT,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    alignSelf: 'flex-start',
  },
  managedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.FAMILY_PRIMARY,
  },
  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addedBadgeText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  // Search
  searchContainer: {
    flex: 1,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    marginHorizontal: SIZES.LG,
    marginTop: SIZES.MD,
    marginBottom: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SIZES.MD,
    height: 48,
  },
  searchIcon: {
    marginRight: SIZES.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    height: '100%',
  },
  searchHint: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SIZES.MD,
  },
  searchHintText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Empty state
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: SIZES.SM,
  },
  emptyTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SIZES.SM,
  },
  emptySubtitle: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    gap: SIZES.SM,
    marginTop: SIZES.MD,
  },
  emptyButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
});

export default PatientsList;
