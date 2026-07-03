import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS, SIZES, CARE_TYPES } from '../../utils/constants';
import {
  type TourResult,
  type GPSPoint,
  type ChronoAppointment,
  chronologicalTour,
  calculateDepartureTimes,
} from '../../utils/routing';
import { STRASBOURG_CENTER } from '../../utils/mapbox';
import { openNavigation } from '../../utils/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentWithPatient {
  id: string;
  patient_file_id: string;
  nurse_id: string;
  date: string;
  time: string;
  care_type: string;
  duration_min: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  address: string | null;
  notes: string | null;
  completion_note: string | null;
  patient_file: {
    id: string;
    patient: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
    patient_profiles: {
      address: string | null;
      address_label: string | null;
      gps_lat: number | null;
      gps_lng: number | null;
    } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  pending:   { color: COLORS.WARNING, label: 'En attente',   icon: 'time-outline' },
  confirmed: { color: COLORS.NURSE_PRIMARY, label: 'Confirmé', icon: 'checkmark-circle-outline' },
  completed: { color: COLORS.SUCCESS, label: 'Terminé',       icon: 'checkmark-circle' },
  cancelled: { color: COLORS.DANGER,  label: 'Annulé',        icon: 'close-circle-outline' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  // time comes as "09:00:00" or "09:00"
  return time.substring(0, 5);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TourneeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tourResult, setTourResult] = useState<TourResult | null>(null);
  const [tourLoading, setTourLoading] = useState(false);
  const today = getTodayISO();

  // -------------------------------------------------------------------------
  // Fetch appointments
  // -------------------------------------------------------------------------

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Step 1: Fetch appointments with patient_files and basic profile info
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient_file:patient_files!patient_file_id(
            id,
            patient_id,
            patient:profiles!patient_id(id, first_name, last_name, phone)
          )
        `)
        .eq('nurse_id', user.id)
        .eq('date', today)
        .order('time', { ascending: true });

      if (error) {
        console.error('[Tournee] fetch error:', error.message);
        return;
      }

      // Step 2: Collect patient_ids and fetch patient_profiles separately
      const patientIds = (data ?? [])
        .map((row: any) => row.patient_file?.patient_id)
        .filter(Boolean);

      let patientProfilesMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('patient_profiles')
          .select('profile_id, address, address_label, gps_lat, gps_lng')
          .in('profile_id', patientIds);

        (profiles ?? []).forEach((pp: any) => {
          patientProfilesMap[pp.profile_id] = pp;
        });
      }

      // Step 3: Merge
      const mapped: AppointmentWithPatient[] = (data ?? []).map((row: any) => {
        const patient = Array.isArray(row.patient_file?.patient)
          ? row.patient_file.patient[0] ?? null
          : row.patient_file?.patient ?? null;
        const patientId = row.patient_file?.patient_id;

        return {
          ...row,
          patient_file: row.patient_file
            ? {
                id: row.patient_file.id,
                patient,
                patient_profiles: patientId
                  ? patientProfilesMap[patientId] ?? null
                  : null,
              }
            : null,
        };
      });

      setAppointments(mapped);

      // Get nurse's current GPS position (fallback to registered address)
      let nurseGPS: GPSPoint | null = null;
      let nurseAddressLabel: string | null = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          nurseGPS = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          nurseAddressLabel = 'Position actuelle';
        }
      } catch {
        // GPS unavailable, will fall back to DB
      }

      // Fallback: use registered primary address from DB
      if (!nurseGPS) {
        const { data: nurseProfile } = await supabase
          .from('nurse_profiles')
          .select('address, gps_lat, gps_lng, addresses')
          .eq('profile_id', user.id)
          .single();

        if (nurseProfile?.addresses && Array.isArray(nurseProfile.addresses) && nurseProfile.addresses.length > 0) {
          const primary = nurseProfile.addresses.find((a: any) => a.is_primary) ?? nurseProfile.addresses[0];
          if (primary.gps_lat && primary.gps_lng) {
            nurseGPS = { lat: primary.gps_lat, lng: primary.gps_lng };
            nurseAddressLabel = primary.address;
          }
        } else if (nurseProfile?.gps_lat != null && nurseProfile?.gps_lng != null) {
          nurseGPS = { lat: nurseProfile.gps_lat, lng: nurseProfile.gps_lng };
          nurseAddressLabel = nurseProfile.address ?? null;
        }
      }

      console.log('[Tournee] Nurse GPS:', nurseGPS
        ? `${nurseGPS.lat.toFixed(4)}, ${nurseGPS.lng.toFixed(4)} (${nurseAddressLabel})`
        : 'Aucune position disponible');

      // Sort patients with GPS by time for chronological ordering
      const chronoAppointments: ChronoAppointment[] = [];
      mapped.forEach((appt, idx) => {
        const pp = appt.patient_file?.patient_profiles;
        if (pp?.gps_lat != null && pp?.gps_lng != null) {
          chronoAppointments.push({
            gps: { lat: pp.gps_lat, lng: pp.gps_lng },
            time: appt.time,
            durationMin: appt.duration_min ?? 60,
            originalIndex: idx,
          });
        }
      });

      // Sort by time (chronological)
      chronoAppointments.sort((a, b) => {
        const ma = a.time.split(':');
        const mb = b.time.split(':');
        return (parseInt(ma[0]) * 60 + parseInt(ma[1])) - (parseInt(mb[0]) * 60 + parseInt(mb[1]));
      });

      console.log('[Tournee] Patients triés chronologiquement:', chronoAppointments.length);
      chronoAppointments.forEach((a, i) => {
        const appt = mapped[a.originalIndex];
        const name = appt?.patient_file?.patient
          ? `${appt.patient_file.patient.first_name} ${appt.patient_file.patient.last_name}`
          : `Patient ${a.originalIndex}`;
        console.log(`[Tournee]   [${i + 1}] ${name} — RDV ${a.time} (${a.durationMin} min) lat:${a.gps.lat.toFixed(4)} lng:${a.gps.lng.toFixed(4)}`);
      });

      if (nurseGPS && chronoAppointments.length >= 1) {
        setTourLoading(true);
        try {
          const { tour, gpsIndices } = await chronologicalTour(nurseGPS, chronoAppointments);

          console.log('[Tournee] Ordre tournée (chronologique):', tour.order
            .map(idx => gpsIndices[idx] === -1 ? 'Infirmière' : (mapped[gpsIndices[idx]]?.patient_file?.patient?.first_name ?? `P${gpsIndices[idx]}`))
            .join(' → '));
          console.log('[Tournee] Total:', tour.totalDistanceKm.toFixed(2), 'km |', tour.totalDurationMin.toFixed(0), 'min');
          tour.legs.forEach((leg) => {
            const fromLabel = gpsIndices[leg.fromIndex] === -1 ? 'Infirmière' : (mapped[gpsIndices[leg.fromIndex]]?.patient_file?.patient?.first_name ?? `P${gpsIndices[leg.fromIndex]}`);
            const toLabel = gpsIndices[leg.toIndex] === -1 ? 'Infirmière' : (mapped[gpsIndices[leg.toIndex]]?.patient_file?.patient?.first_name ?? `P${gpsIndices[leg.toIndex]}`);
            console.log(`[Tournee]   ${fromLabel} → ${toLabel} | ${leg.distanceKm.toFixed(2)} km | ${leg.durationMin.toFixed(0)} min`);
          });

          // Build mappedAppointments indexed by gpsPoints index (not position!)
          const mappedAppointments: { time: string }[] = [];
          mappedAppointments[0] = { time: chronoAppointments[0]?.time ?? '08:00' }; // nurse placeholder
          chronoAppointments.forEach((a, i) => {
            mappedAppointments[i + 1] = { time: a.time };
          });

          const legsWithDeparture = calculateDepartureTimes(tour, mappedAppointments);

          console.log('[Tournee] Heures de départ:');
          legsWithDeparture.forEach((leg) => {
            const fromLabel = gpsIndices[leg.fromIndex] === -1 ? 'Infirmière' : (mapped[gpsIndices[leg.fromIndex]]?.patient_file?.patient?.first_name ?? `P${gpsIndices[leg.fromIndex]}`);
            const toLabel = gpsIndices[leg.toIndex] === -1 ? 'Infirmière' : (mapped[gpsIndices[leg.toIndex]]?.patient_file?.patient?.first_name ?? `P${gpsIndices[leg.toIndex]}`);
            const arrivalTime = mappedAppointments[leg.toIndex]?.time ?? '?';
            console.log(`[Tournee]   ${fromLabel} → ${toLabel} | Départ: ${leg.departureTime} | Arrivée: ${arrivalTime} | ${leg.distanceKm.toFixed(2)} km | ${leg.durationMin.toFixed(0)} min`);
          });

          // Filter out legs starting from nurse home, remap indices
          const patientLegs = legsWithDeparture
            .filter((leg) => gpsIndices[leg.fromIndex] !== -1)
            .map((leg) => ({
              ...leg,
              fromIndex: gpsIndices[leg.fromIndex],
              toIndex: gpsIndices[leg.toIndex],
            }));

          // Departure time from nurse position to first patient
          const firstPatientLeg = legsWithDeparture.find((l) => gpsIndices[l.fromIndex] === -1);
          const departureFromHome = firstPatientLeg?.departureTime ?? null;

          const remappedTour: TourResult = {
            ...tour,
            order: tour.order
              .filter((gpsIdx) => gpsIndices[gpsIdx] !== -1)
              .map((gpsIdx) => gpsIndices[gpsIdx]),
            legs: patientLegs,
            departureFromHome,
            nurseAddress: nurseAddressLabel,
          };
          setTourResult(remappedTour);

          console.log('[Tournee] === RÉSUMÉ TOURNÉE ===');
          console.log('[Tournee] Départ:', nurseAddressLabel);
          console.log('[Tournee] Heure départ recommandée:', departureFromHome || 'N/A');
          console.log('[Tournee] Distance totale:', remappedTour.totalDistanceKm.toFixed(2), 'km');
          console.log('[Tournee] Durée totale:', remappedTour.totalDurationMin.toFixed(0), 'min');
          remappedTour.order.forEach((apptIdx, i) => {
            const appt = mapped[apptIdx];
            const patientName = appt?.patient_file?.patient
              ? `${appt.patient_file.patient.first_name} ${appt.patient_file.patient.last_name}`
              : `Patient ${apptIdx}`;
            const time = appt?.time ?? '?';
            const leg = remappedTour.legs[i];
            const legInfo = leg ? ` | trajet: ${leg.distanceKm.toFixed(2)} km / ${leg.durationMin.toFixed(0)} min depuis arrêt précédent` : '';
            console.log(`[Tournee]   RDV: ${time} — ${patientName}${legInfo}`);
          });
          console.log('[Tournee] =====================');
        } catch (err) {
          console.error('[Tournee] tour calculation error:', err);
        } finally {
          setTourLoading(false);
        }
      } else {
        setTourResult(null);
      }
    } catch (err) {
      console.error('[Tournee] unexpected:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // -------------------------------------------------------------------------
  // Mark as completed
  // -------------------------------------------------------------------------

  const handleComplete = async (appointmentId: string) => {
    setCompletingId(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)
        .eq('nurse_id', user?.id ?? '');

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, status: 'completed' } : a
        )
      );
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setCompletingId(null);
    }
  };

  const confirmComplete = (appointmentId: string, patientName: string) => {
    Alert.alert(
      'Confirmer le soin',
      `Marquer le soin de ${patientName} comme terminé ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminé',
          onPress: () => handleComplete(appointmentId),
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const totalRDV = appointments.length;
  const completedRDV = appointments.filter((a) => a.status === 'completed').length;
  const remainingRDV = totalRDV - completedRDV;

  // -------------------------------------------------------------------------
  // Map markers
  // -------------------------------------------------------------------------

  const markers = appointments
    .filter((a) => {
      const pp = a.patient_file?.patient_profiles;
      return pp?.gps_lat != null && pp?.gps_lng != null;
    })
    .map((a, index) => {
      const pp = a.patient_file!.patient_profiles!;
      const patient = a.patient_file?.patient;
      const name = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
      const config = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;

      return {
        id: a.id,
        coordinate: {
          latitude: pp.gps_lat!,
          longitude: pp.gps_lng!,
        },
        title: name,
        subtitle: `${formatTime(a.time)} — ${a.care_type}`,
        index: index + 1,
        color: config.color,
      };
    });

  // -------------------------------------------------------------------------
  // Fit map to markers
  // -------------------------------------------------------------------------

  const fitMapToMarkers = useCallback(() => {
    if (markers.length === 0 || !mapRef.current) return;
    const coordinates = markers.map((m) => m.coordinate);
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [markers]);

  useEffect(() => {
    if (!loading && markers.length > 0) {
      setTimeout(fitMapToMarkers, 500);
    }
  }, [loading, markers.length, fitMapToMarkers]);

  // -------------------------------------------------------------------------
  // Render appointment card
  // -------------------------------------------------------------------------

  const renderAppointmentCard = ({ item }: { item: AppointmentWithPatient }) => {
    const patient = item.patient_file?.patient;
    const pp = item.patient_file?.patient_profiles;
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const isCompleted = item.status === 'completed';
    const isCompleting = completingId === item.id;
    const isSelected = selectedId === item.id;
    const patientName = patient
      ? `${patient.first_name} ${patient.last_name}`
      : 'Patient inconnu';
    const address = pp?.address ?? item.address ?? 'Adresse non renseignée';
    const hasGPS = pp?.gps_lat != null && pp?.gps_lng != null;
    const apptIndex = appointments.indexOf(item);

    // Find tour leg for this appointment (arrival info)
    const leg = tourResult?.legs.find((l) => l.toIndex === apptIndex);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isCompleted && styles.cardCompleted,
          isSelected && styles.cardSelected,
        ]}
        activeOpacity={0.8}
        onPress={() => setSelectedId(isSelected ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          {/* Number badge */}
          <View style={[styles.numberBadge, { backgroundColor: config.color }]}>
            <Text style={styles.numberText}>
              {appointments.indexOf(item) + 1}
            </Text>
          </View>

          {/* Time + patient */}
          <View style={styles.cardMainInfo}>
            <Text style={[styles.cardTime, isCompleted && styles.textMuted]}>
              {formatTime(item.time)}
            </Text>
            <Text
              style={[styles.cardPatientName, isCompleted && styles.textMuted]}
              numberOfLines={1}
            >
              {patientName}
            </Text>
            <Text style={styles.cardCareType}>{item.care_type}</Text>
            <Text style={styles.cardDuration}>{item.duration_min ?? 60} min</Text>
          </View>

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: config.color + '20', borderColor: config.color },
            ]}
          >
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.cardAddressRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.TEXT_MUTED} />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {address}
          </Text>
        </View>

        {/* Travel info (OSRM) */}
        {leg && leg.distanceKm > 0 && (
          <View style={styles.travelRow}>
            <Ionicons name="car-outline" size={14} color={COLORS.NURSE_PRIMARY} />
            <Text style={styles.travelText}>
              {leg.distanceKm} km · {leg.durationMin} min
            </Text>
            {leg.departureTime && apptIndex > 0 && (
              <View style={styles.departureBadge}>
                <Ionicons name="alarm-outline" size={12} color={COLORS.WHITE} />
                <Text style={styles.departureText}>
                  Partez {leg.departureTime}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions (shown when selected) */}
        {isSelected && (
          <View style={styles.cardActions}>
            {hasGPS && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openNavigation(pp!.gps_lat!, pp!.gps_lng!)}
              >
                <Ionicons name="navigate" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Y aller</Text>
              </TouchableOpacity>
            )}

            {!hasGPS && pp?.address && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  const encoded = encodeURIComponent(pp.address!);
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
                  );
                }}
              >
                <Ionicons name="navigate" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Y aller</Text>
              </TouchableOpacity>
            )}

            {!isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.SUCCESS }]}
                onPress={() => confirmComplete(item.id, patientName)}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>Terminé</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {patient?.phone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.INFO }]}
                onPress={() => Linking.openURL(`tel:${patient.phone}`)}
              >
                <Ionicons name="call" size={18} color={COLORS.WHITE} />
                <Text style={styles.actionBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() =>
                navigation.navigate('PatientDetail', {
                  patientId: item.patient_file?.patient?.id,
                  patientFileId: item.patient_file?.id,
                })
              }
            >
              <Ionicons name="person-outline" size={18} color={COLORS.NURSE_PRIMARY} />
              <Text style={[styles.actionBtnText, { color: COLORS.NURSE_PRIMARY }]}>
                Fiche
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
          <ActivityIndicator size="large" color={COLORS.NURSE_PRIMARY} />
          <Text style={styles.loadingText}>Chargement de la tournée...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ma Tournée</Text>
          <Text style={styles.headerDate}>{formatDateLabel(today)}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchAppointments}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.NURSE_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {markers.length > 0 && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={STRASBOURG_CENTER}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {markers.map((m) => (
              <Marker
                key={m.id}
                coordinate={m.coordinate}
                onPress={() => setSelectedId(m.id)}
              >
                <View
                  style={[
                    styles.markerBubble,
                    { backgroundColor: m.color },
                    selectedId === m.id && styles.markerSelected,
                  ]}
                >
                  <Text style={styles.markerText}>{m.index}</Text>
                </View>
                <Callout tooltip>
                  <View style={styles.calloutContent}>
                    <Text style={styles.calloutTitle}>{m.title}</Text>
                    <Text style={styles.calloutSubtitle}>{m.subtitle}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRDV}</Text>
          <Text style={styles.statLabel}>RDV</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>
            {completedRDV}
          </Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.WARNING }]}>
            {remainingRDV}
          </Text>
          <Text style={styles.statLabel}>Restants</Text>
        </View>
      </View>

      {/* Tour summary */}
      {tourResult && (tourResult.legs.length > 0 || tourResult.departureFromHome) && (
        <View style={styles.tourSummary}>
          {tourLoading ? (
            <ActivityIndicator size="small" color={COLORS.NURSE_PRIMARY} />
          ) : (
            <>
              <Ionicons name="map" size={16} color={COLORS.NURSE_PRIMARY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tourSummaryText}>
                  {tourResult.totalDistanceKm} km · {tourResult.totalDurationMin} min de route
                </Text>
                {tourResult.nurseAddress && (
                  <Text style={styles.tourSummarySubtext}>
                    Départ : {tourResult.nurseAddress}
                  </Text>
                )}
              </View>
              {tourResult.departureFromHome && (
                <View style={styles.tourDepartureBadge}>
                  <Ionicons name="alarm-outline" size={12} color={COLORS.WHITE} />
                  <Text style={styles.tourDepartureText}>
                    Partez {tourResult.departureFromHome}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Appointments list */}
      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color={COLORS.BORDER} />
          <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
          <Text style={styles.emptySubtitle}>
            Pas de tournée prévue pour aujourd'hui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.3;

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
  loadingText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
  },
  // Header
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
  headerDate: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Map
  mapContainer: {
    height: MAP_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  map: {
    flex: 1,
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerSelected: {
    transform: [{ scale: 1.3 }],
    borderColor: COLORS.BLACK,
  },
  markerText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  calloutContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    minWidth: 150,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  calloutSubtitle: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.BORDER,
  },
  // List
  listContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  // Card
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.SM,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompleted: {
    borderLeftColor: COLORS.SUCCESS,
    opacity: 0.8,
  },
  cardSelected: {
    borderLeftColor: COLORS.NURSE_PRIMARY,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.SM,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.SM,
  },
  numberText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
  },
  cardMainInfo: {
    flex: 1,
    marginRight: SIZES.SM,
  },
  cardTime: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: COLORS.NURSE_PRIMARY,
  },
  cardPatientName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  cardCareType: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  cardDuration: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAddress: {
    flex: 1,
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginLeft: 6,
  },
  textMuted: {
    opacity: 0.6,
  },
  // Travel info (OSRM)
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.XS,
    gap: SIZES.XS,
  },
  travelText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  departureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 3,
    marginLeft: 'auto',
  },
  departureText: {
    fontSize: 10,
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  // Tour summary
  tourSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_LIGHT,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: SIZES.SM,
  },
  tourSummaryText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  tourSummarySubtext: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  tourDepartureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.SM,
    paddingVertical: 3,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 3,
  },
  tourDepartureText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  // Actions
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.SM,
    marginTop: SIZES.MD,
    paddingTop: SIZES.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    gap: 4,
  },
  actionBtnOutline: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.NURSE_PRIMARY,
  },
  actionBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_XS,
    fontWeight: '600',
  },
  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.SM,
    paddingHorizontal: 40,
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
  },
});

export default TourneeScreen;
