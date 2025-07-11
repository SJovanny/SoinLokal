// Utilisateurs de test pour le développement
// Ces comptes permettent de tester l'application sans nécessiter Firebase Auth

export const TEST_USERS = {
  // Compte administrateur infirmière
  ADMIN_NURSE: {
    email: 'admin@soinlokal.com',
    password: 'admin',
    userType: 'nurse',
    profile: {
      uid: 'test-nurse-admin',
      userType: 'nurse',
      firstName: 'Dr. Admin',
      lastName: 'Infirmière',
      email: 'admin@soinlokal.com',
      phone: '+596 696 12 34 56',
      adeli: '971234567',
      specialties: ['Soins généraux', 'Pansements', 'Injections', 'Prélèvements'],
      address: {
        street: '123 Rue de la Santé',
        city: 'Fort-de-France',
        postalCode: '97200',
        country: 'Martinique'
      },
      workSchedule: {
        monday: { start: '08:00', end: '18:00' },
        tuesday: { start: '08:00', end: '18:00' },
        wednesday: { start: '08:00', end: '18:00' },
        thursday: { start: '08:00', end: '18:00' },
        friday: { start: '08:00', end: '17:00' },
        saturday: { start: '09:00', end: '12:00' },
        sunday: { available: false }
      },
      isVerified: true,
      isActive: true,
      joinedDate: '2024-01-15',
      totalPatients: 45,
      totalVisits: 287,
      rating: 4.8,
      createdAt: new Date().toISOString()
    }
  },

  // Compte patient standard
  PATIENT: {
    email: 'patient@soinlokal.com',
    password: 'patient',
    userType: 'patient',
    profile: {
      uid: 'test-patient',
      userType: 'patient',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'patient@soinlokal.com',
      phone: '+596 696 65 43 21',
      dateOfBirth: '1950-05-15',
      address: {
        street: '456 Avenue des Patients',
        city: 'Schoelcher',
        postalCode: '97233',
        country: 'Martinique'
      },
      emergencyContact: {
        name: 'Marie Dupont',
        relationship: 'Épouse',
        phone: '+596 696 78 91 23'
      },
      medicalInfo: {
        allergies: ['Pénicilline', 'Aspirine'],
        chronicConditions: ['Diabète type 2', 'Hypertension'],
        medications: [
          'Metformine 500mg - 2x/jour',
          'Lisinopril 10mg - 1x/jour matin'
        ],
        bloodType: 'A+',
        weight: '75kg',
        height: '170cm'
      },
      assignedNurse: 'test-nurse-admin',
      lastVisit: '2024-07-05',
      nextAppointment: '2024-07-10',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  },

  // Compte famille/proche
  FAMILY: {
    email: 'famille@soinlokal.com',
    password: 'famille',
    userType: 'patient',
    profile: {
      uid: 'test-family',
      userType: 'patient',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'famille@soinlokal.com',
      phone: '+596 696 98 76 54',
      isFamily: true,
      patientRelation: 'Fille',
      linkedPatient: {
        uid: 'test-elderly-patient',
        name: 'Pierre Martin',
        relationship: 'Père',
        dateOfBirth: '1935-12-03'
      },
      address: {
        street: '789 Rue Familiale',
        city: 'Le Lamentin',
        postalCode: '97232',
        country: 'Martinique'
      },
      accessLevel: 'full', // full, limited, emergency-only
      notifications: {
        appointments: true,
        emergencies: true,
        reports: true,
        medication: true
      },
      isActive: true,
      createdAt: new Date().toISOString()
    }
  }
};

// Fonction utilitaire pour obtenir un utilisateur de test
export const getTestUser = (identifier) => {
  const users = Object.values(TEST_USERS);
  return users.find(user => 
    user.email === identifier || 
    user.profile.uid === identifier ||
    (identifier === 'admin' && user.userType === 'nurse') ||
    (identifier === 'patient' && user.userType === 'patient' && !user.profile.isFamily) ||
    (identifier === 'famille' && user.profile.isFamily)
  );
};

// Fonction pour valider les identifiants de test
export const validateTestCredentials = (email, password) => {
  const users = Object.values(TEST_USERS);
  return users.find(user => user.email === email && user.password === password);
};

// Liste des comptes de test pour l'affichage
export const TEST_ACCOUNTS_INFO = [
  {
    type: '👩‍⚕️ Infirmière (Admin)',
    email: 'admin@soinlokal.com',
    password: 'admin',
    description: 'Accès complet aux fonctionnalités infirmière'
  },
  {
    type: '🏥 Patient',
    email: 'patient@soinlokal.com',
    password: 'patient',
    description: 'Accès patient standard avec historique médical'
  },
  {
    type: '👨‍👩‍👧‍👦 Famille',
    email: 'famille@soinlokal.com',
    password: 'famille',
    description: 'Accès famille pour suivi d\'un proche'
  }
];

export default TEST_USERS;
