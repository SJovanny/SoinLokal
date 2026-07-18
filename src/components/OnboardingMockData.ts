import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Infirmière
// ---------------------------------------------------------------------------

export const NURSE_MOCK = {
  stats: {
    patients: 24,
    visitesToday: 6,
    terminees: 3,
    restantes: 3,
  },
  appointments: [
    {
      name: 'Marie Beaumont',
      care: 'Pansement',
      time: '08:30',
      address: '12 Rue des Lilas, Fort-de-France',
      status: 'completed' as const,
    },
    {
      name: 'Joseph Fanfan',
      care: 'Injection',
      time: '09:15',
      address: '5 Avenue des Arawaks, Le Lamentin',
      status: 'completed' as const,
    },
    {
      name: 'Lucie Saint-Cyr',
      care: 'Prise de sang',
      time: '10:00',
      address: '8 Boulevard de la Liberté, Fort-de-France',
      status: 'completed' as const,
    },
    {
      name: 'André Moreau',
      care: 'Contrôle glycémie',
      time: '11:00',
      address: '3 Rue Victor Hugo, Schoelcher',
      status: 'pending' as const,
    },
    {
      name: 'Carole Dumas',
      care: 'Soins post-opératoires',
      time: '14:00',
      address: '22 Chemin des Cocotiers, Ducos',
      status: 'pending' as const,
    },
  ],
  conversations: [
    {
      name: 'Marie Beaumont',
      lastMsg: 'Merci pour ce matin, à demain !',
      time: '10:45',
      unread: 0,
    },
    {
      name: 'Joseph Fanfan',
      lastMsg: 'Est-ce que je dois jeûner demain ?',
      time: '09:30',
      unread: 1,
    },
    {
      name: 'Lucie Saint-Cyr',
      lastMsg: 'Résultats disponibles',
      time: 'Hier',
      unread: 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tournée (mock with real Martinique-style addresses)
// ---------------------------------------------------------------------------

export const TOURNEE_MOCK = [
  { name: 'Marie Beaumont', time: '08:30', address: '12 Rue des Lilas', lat: 14.6161, lng: -61.0742 },
  { name: 'Joseph Fanfan', time: '09:15', address: '5 Ave. des Arawaks', lat: 14.6100, lng: -61.0033 },
  { name: 'Lucie Saint-Cyr', time: '10:00', address: '8 Bd. de la Liberté', lat: 14.6094, lng: -61.0667 },
  { name: 'André Moreau', time: '11:00', address: '3 Rue Victor Hugo', lat: 14.6089, lng: -61.0998 },
  { name: 'Carole Dumas', time: '14:00', address: '22 Chemin des Cocotiers', lat: 14.5464, lng: -60.9673 },
];

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export const PATIENT_MOCK = {
  stats: {
    prochainsRDV: 3,
    soinsRecus: 12,
    messages: 1,
  },
  appointments: [
    {
      nurse: 'Infirm. Marie Laurent',
      care: 'Pansement',
      date: 'Demain',
      time: '09:00',
      status: 'confirmed' as const,
    },
    {
      nurse: 'Infirm. Marie Laurent',
      care: 'Injection',
      date: '15 janv.',
      time: '10:30',
      status: 'pending' as const,
    },
    {
      nurse: 'Infirm. Marie Laurent',
      care: 'Prise de sang',
      date: '22 janv.',
      time: '08:00',
      status: 'confirmed' as const,
    },
  ],
  recentCares: [
    {
      care: 'Pansement',
      nurse: 'M. Laurent',
      date: '10 janv.',
      note: 'Cicatrisation en bonne évolution',
    },
    {
      care: 'Contrôle tension',
      nurse: 'M. Laurent',
      date: '8 janv.',
      note: 'TA: 13/8 — stable',
    },
  ],
  conversations: [
    {
      name: 'Infirm. Marie Laurent',
      lastMsg: 'Votre RDV est confirmé pour demain 9h',
      time: '14:20',
      unread: 1,
    },
  ],
};

// ---------------------------------------------------------------------------
// Famille
// ---------------------------------------------------------------------------

export const FAMILY_MOCK = {
  patient: {
    firstName: 'Henri',
    lastName: 'Beaumont',
    nurse: 'Infirm. Marie Laurent',
  },
  stats: {
    prochainsRDV: 2,
    soinsRecus: 8,
    messages: 0,
  },
  appointments: [
    {
      nurse: 'Infirm. Marie Laurent',
      care: 'Pansement',
      date: 'Demain',
      time: '09:00',
      status: 'confirmed' as const,
    },
    {
      nurse: 'Infirm. Marie Laurent',
      care: 'Médicaments',
      date: '16 janv.',
      time: '11:00',
      status: 'pending' as const,
    },
  ],
  recentCares: [
    {
      care: 'Pansement',
      date: '10 janv.',
      note: 'Cicatrisation OK, changement prévu',
    },
    {
      care: 'Toilette patient',
      date: '9 janv.',
      note: 'Patient confortable',
    },
  ],
  conversations: [
    {
      name: 'Infirm. Marie Laurent',
      lastMsg: 'Tout va bien pour Henri, RDV confirmé',
      time: 'Hier',
      unread: 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// Slides config
// ---------------------------------------------------------------------------

export interface OnboardingSlide {
  icon: IoniconName;
  title: string;
  description: string;
  previewType: 'welcome' | 'dashboard' | 'patients' | 'tournee' | 'messages' | 'profile' | 'suivi';
}

export const NURSE_SLIDES: OnboardingSlide[] = [
  {
    icon: 'medkit',
    title: 'Bienvenue sur SoinLokal',
    description: 'Votre compagnon pour organiser vos soins à domicile en Martinique. Découvrez les fonctionnalités clés en quelques étapes.',
    previewType: 'welcome',
  },
  {
    icon: 'home',
    title: 'Votre tableau de bord',
    description: 'Consultez vos statistiques, vos rendez-vous du jour et accédez rapidement aux actions essentielles.',
    previewType: 'dashboard',
  },
  {
    icon: 'people',
    title: 'Gestion des patients',
    description: 'Accédez à la liste de vos patients, leurs dossiers et leurs historiques de soins.',
    previewType: 'patients',
  },
  {
    icon: 'map',
    title: 'Tournée optimisée',
    description: 'L\'app calcule l\'itinéraire le plus efficace pour vos visites à domicile. Suivez le parcours sur la carte.',
    previewType: 'tournee',
  },
  {
    icon: 'chatbubbles',
    title: 'Messagerie sécurisée',
    description: 'Échangez avec vos patients en toute confidentialité. Notifications en temps réel.',
    previewType: 'messages',
  },
];

export const PATIENT_SLIDES: OnboardingSlide[] = [
  {
    icon: 'heart',
    title: 'Bienvenue sur SoinLokal',
    description: 'Gérez vos soins à domicile simplement. Suivez vos rendez-vous et communiquez avec votre infirmière.',
    previewType: 'welcome',
  },
  {
    icon: 'home',
    title: 'Votre accueil',
    description: 'Retrouvez vos prochains rendez-vous, vos soins récents et votre statut en un coup d\'œil.',
    previewType: 'dashboard',
  },
  {
    icon: 'chatbubbles',
    title: 'Messagerie',
    description: 'Contactez directement votre infirmière pour toute question ou demande de rendez-vous.',
    previewType: 'messages',
  },
  {
    icon: 'person',
    title: 'Votre profil',
    description: 'Mettez à jour vos informations personnelles, adresse et contact d\'urgence.',
    previewType: 'profile',
  },
];

export const FAMILY_SLIDES: OnboardingSlide[] = [
  {
    icon: 'people',
    title: 'Bienvenue sur SoinLokal',
    description: 'Suivez les soins de votre proche et restez en contact avec son infirmière.',
    previewType: 'welcome',
  },
  {
    icon: 'heart-outline',
    title: 'Suivi de votre proche',
    description: 'Consultez les rendez-vous à venir et l\'historique des soins de votre proche.',
    previewType: 'suivi',
  },
  {
    icon: 'chatbubbles',
    title: 'Messagerie',
    description: 'Échangez avec l\'infirmière qui s\'occupe de votre proche.',
    previewType: 'messages',
  },
  {
    icon: 'person',
    title: 'Votre profil',
    description: 'Gérez vos informations et consultez les détails de votre proche suivi.',
    previewType: 'profile',
  },
];
