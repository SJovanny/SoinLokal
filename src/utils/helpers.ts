// Utilitaires pour SoinLokal

import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Email / phone validation
// ---------------------------------------------------------------------------

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Validates French / Martinique phone numbers (+33 or 0x format). */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Geo utilities
// ---------------------------------------------------------------------------

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/** Haversine formula — returns distance in km. */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Returns estimated travel time in minutes (average 35 km/h for Martinique). */
export function estimateTravelTime(distanceKm: number): number {
  const averageSpeedKmh = 35;
  return Math.round((distanceKm / averageSpeedKmh) * 60);
}

// ---------------------------------------------------------------------------
// Date / time formatting (French locale)
// ---------------------------------------------------------------------------

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('fr-FR', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ---------------------------------------------------------------------------
// Supabase auth error handler
// ---------------------------------------------------------------------------

export interface AuthError {
  code?: string;
  message?: string;
}

/**
 * Maps Supabase auth error codes to human-readable French messages.
 */
export function handleAuthError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect';
    case 'email_already_exists':
      return 'Cette adresse email est déjà utilisée';
    case 'weak_password':
      return 'Le mot de passe doit contenir au moins 6 caractères';
    case 'user_not_found':
      return 'Aucun compte trouvé avec cette adresse email';
    case 'email_not_confirmed':
      return 'Veuillez confirmer votre adresse email avant de vous connecter';
    case 'over_email_send_rate_limit':
      return 'Trop de tentatives. Veuillez réessayer plus tard';
    case 'network_failure':
      return 'Erreur de connexion. Vérifiez votre connexion internet';
    default:
      return error.message ?? 'Une erreur est survenue';
  }
}

// ---------------------------------------------------------------------------
// Standardised alerts
// ---------------------------------------------------------------------------

export function showAlert(
  title: string,
  message: string,
  onPress?: () => void,
): void {
  Alert.alert(
    title,
    message,
    onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }],
  );
}

export function showConfirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
): void {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel', onPress: onCancel },
    { text: 'Confirmer', onPress: onConfirm },
  ]);
}

// ---------------------------------------------------------------------------
// Route optimisation (nearest-neighbour)
// ---------------------------------------------------------------------------

export interface GeoPoint {
  latitude:  number;
  longitude: number;
}

export type PatientWithLocation<T extends GeoPoint = GeoPoint> = T;

export interface OptimisedStop<T extends GeoPoint> {
  patient:             T;
  estimatedTravelTime: number;
}

export function optimizeRoute<T extends GeoPoint>(
  currentLocation: GeoPoint,
  patients: T[],
): Array<T & { estimatedTravelTime: number }> {
  if (!patients || patients.length === 0) return [];

  const result: Array<T & { estimatedTravelTime: number }> = [];
  const remaining = [...patients];
  let currentPos: GeoPoint = currentLocation;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((patient, index) => {
      const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        patient.latitude,
        patient.longitude,
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [nearestPatient] = remaining.splice(nearestIndex, 1);
    result.push({
      ...nearestPatient,
      estimatedTravelTime: estimateTravelTime(nearestDistance),
    });

    currentPos = {
      latitude:  nearestPatient.latitude,
      longitude: nearestPatient.longitude,
    };
  }

  return result;
}
