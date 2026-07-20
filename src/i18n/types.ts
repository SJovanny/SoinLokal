export interface TranslationKeys {
  common: {
    cancel: string;
    save: string;
    confirm: string;
    delete: string;
    loading: string;
    error: string;
    retry: string;
    back: string;
    close: string;
    done: string;
    search: string;
    noResults: string;
    offline: string;
  };
  auth: {
    login: string;
    register: string;
    email: string;
    password: string;
    forgotPassword: string;
    loginTitle: string;
    registerTitle: string;
    welcome: string;
    greeting: string;
    roleMismatch: string;
    invalidCredentials: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    noAccount: string;
    hasAccount: string;
    signUp: string;
    logOut: string;
    fillAllFields: string;
    nurseAccountRequired: string;
    patientAccountRequired: string;
  };
  nurse: {
    dashboard: string;
    patients: string;
    tour: string;
    messages: string;
    profile: string;
    todayAppointments: string;
    completedCares: string;
    remainingCares: string;
    newPatient: string;
    addToTour: string;
    myTour: string;
    careHistory: string;
    optimizeTour: string;
    startNavigation: string;
    completeCare: string;
    careType: string;
  };
  patient: {
    dashboard: string;
    history: string;
    messages: string;
    profile: string;
    upcomingAppointments: string;
    recentCares: string;
    receivedCare: string;
    exportData: string;
    emergencyContact: string;
    medicalNotes: string;
  };
  family: {
    dashboard: string;
    tracking: string;
    managedPatient: string;
    addPatient: string;
    nurseProfile: string;
  };
}
