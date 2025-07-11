// Utilitaires pour SoinLokal

import { Alert } from 'react-native';

// Validation des emails
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation des numéros de téléphone (format français/martiniquais)
export const validatePhone = (phone) => {
  const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Formatage des numéros de téléphone
export const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

// Calcul de la distance entre deux points (formule de Haversine)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

// Formatage des dates
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calcul du temps de trajet estimé (basé sur la distance)
export const estimateTravelTime = (distance) => {
  // Vitesse moyenne en Martinique : ~30 km/h en zone urbaine, 50 km/h sur route
  const averageSpeed = 35; // km/h
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  return timeInMinutes;
};

// Génération d'un ID unique
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Gestion des erreurs Firebase
export const handleFirebaseError = (error) => {
  let message = 'Une erreur est survenue';
  
  switch (error.code) {
    case 'auth/user-not-found':
      message = 'Aucun compte trouvé avec cette adresse email';
      break;
    case 'auth/wrong-password':
      message = 'Mot de passe incorrect';
      break;
    case 'auth/email-already-in-use':
      message = 'Cette adresse email est déjà utilisée';
      break;
    case 'auth/weak-password':
      message = 'Le mot de passe doit contenir au moins 6 caractères';
      break;
    case 'auth/invalid-email':
      message = 'Adresse email invalide';
      break;
    case 'auth/too-many-requests':
      message = 'Trop de tentatives. Veuillez réessayer plus tard';
      break;
    case 'auth/network-request-failed':
      message = 'Erreur de connexion. Vérifiez votre connexion internet';
      break;
    default:
      message = error.message || 'Une erreur est survenue';
  }
  
  return message;
};

// Affichage d'alertes standardisées
export const showAlert = (title, message, onPress = null) => {
  Alert.alert(
    title,
    message,
    onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }]
  );
};

export const showConfirmAlert = (title, message, onConfirm, onCancel = null) => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Annuler', style: 'cancel', onPress: onCancel },
      { text: 'Confirmer', onPress: onConfirm }
    ]
  );
};

// Optimisation des tournées (algorithme simple du plus proche voisin)
export const optimizeRoute = (currentLocation, patients) => {
  if (!patients || patients.length === 0) return [];
  
  const optimizedRoute = [];
  const remainingPatients = [...patients];
  let currentPos = currentLocation;
  
  while (remainingPatients.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remainingPatients.forEach((patient, index) => {
      const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        patient.latitude,
        patient.longitude
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    
    const nearestPatient = remainingPatients.splice(nearestIndex, 1)[0];
    optimizedRoute.push({
      ...nearestPatient,
      estimatedTravelTime: estimateTravelTime(nearestDistance)
    });
    
    currentPos = {
      latitude: nearestPatient.latitude,
      longitude: nearestPatient.longitude
    };
  }
  
  return optimizedRoute;
};
