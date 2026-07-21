import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../utils/constants';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMessageCount } from '../contexts/MessageCountContext';
import SplashScreen from '../components/SplashScreen';
import OnboardingModal from '../components/OnboardingModal';

// Écrans d'authentification
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Écrans infirmière
import NurseDashboard from '../screens/nurse/NurseDashboard';
import PatientsList from '../screens/nurse/PatientsList';
import PatientDetail from '../screens/nurse/PatientDetail';
import CareHistoryScreen from '../screens/nurse/CareHistoryScreen';
import TourneeScreen from '../screens/nurse/TourneeScreen';
import ProfileScreen from '../screens/nurse/ProfileScreen';
import NursePendingVerificationScreen from '../screens/nurse/NursePendingVerificationScreen';

// Écrans patient
import PatientDashboard from '../screens/patient/PatientDashboard';
import PatientCareHistory from '../screens/patient/PatientCareHistory';
import PatientProfile from '../screens/patient/PatientProfile';
import ExportDataScreen from '../screens/patient/ExportDataScreen';
import MessagingScreen from '../screens/shared/MessagingScreen';
import ChatScreen from '../screens/shared/ChatScreen';

// Écrans famille
import FamilyDashboard from '../screens/family/FamilyDashboard';
import FamilyCareHistory from '../screens/family/FamilyCareHistory';
import FamilyProfile from '../screens/family/FamilyProfile';
import AddManagedPatient from '../screens/family/AddManagedPatient';
import NurseProfileView from '../screens/family/NurseProfileView';

// Écrans admin
import AdminWebOnlyScreen from '../screens/admin/AdminWebOnlyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation pour les infirmières
const NurseTabNavigator = () => {
  const { unreadCount } = useMessageCount();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false, // Masquer le header en haut
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: React.ComponentProps<typeof Ionicons>['name'] | undefined;
        switch (route.name) {
          case 'Dashboard':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Patients':
            iconName = focused ? 'people' : 'people-outline';
            break;
          case 'Tournée':
            iconName = focused ? 'map' : 'map-outline';
            break;
          case 'Messages':
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            break;
          case 'Profil':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }
        return <Ionicons name={iconName!} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.NURSE_PRIMARY,
      tabBarInactiveTintColor: colors.TEXT_MUTED,
      tabBarStyle: {
        backgroundColor: colors.SURFACE,
        borderTopColor: colors.BORDER,
        borderTopWidth: 1,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={NurseDashboard}
      options={{
        title: 'Accueil',
        headerShown: false
      }}
    />
    <Tab.Screen
      name="Patients"
      component={PatientsList}
      options={{
        title: 'Patients',
        headerShown: false
      }}
    />
    <Tab.Screen
      name="Tournée"
      component={TourneeScreen}
      options={{
        title: 'Tournée',
        headerShown: false
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagingScreen}
      options={{
        title: 'Messages',
        headerShown: false,
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: { backgroundColor: colors.DANGER },
      }}
    />
    <Tab.Screen
      name="Profil"
      component={ProfileScreen}
      options={{
        title: 'Profil',
        headerShown: false
      }}
    />
  </Tab.Navigator>
  );
};

// Navigation pour les patients
const PatientTabNavigator = () => {
  const { unreadCount } = useMessageCount();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false, // Masquer le header en haut
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: React.ComponentProps<typeof Ionicons>['name'] | undefined;
        switch (route.name) {
          case 'Dashboard':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Historique':
            iconName = focused ? 'document-text' : 'document-text-outline';
            break;
          case 'Messages':
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            break;
          case 'Profil':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }
        return <Ionicons name={iconName!} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.PATIENT_PRIMARY,
      tabBarInactiveTintColor: colors.TEXT_MUTED,
      tabBarStyle: {
        backgroundColor: colors.SURFACE,
        borderTopColor: colors.BORDER,
        borderTopWidth: 1,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={PatientDashboard}
      options={{
        title: 'Accueil',
        headerShown: false
      }}
    />
    <Tab.Screen
      name="Historique"
      component={PatientCareHistory}
      options={{
        title: 'Historique',
        headerShown: false
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagingScreen}
      options={{
        title: 'Messages',
        headerShown: false,
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: { backgroundColor: colors.DANGER },
      }}
    />
    <Tab.Screen
      name="Profil"
      component={PatientProfile}
      options={{
        title: 'Profil',
        headerShown: false,
      }}
    />
  </Tab.Navigator>
  );
};

// Navigation pour les familles
const FamilyTabNavigator = () => {
  const { unreadCount } = useMessageCount();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: React.ComponentProps<typeof Ionicons>['name'] | undefined;
        switch (route.name) {
          case 'Suivi':
            iconName = focused ? 'heart' : 'heart-outline';
            break;
          case 'Historique':
            iconName = focused ? 'document-text' : 'document-text-outline';
            break;
          case 'Messages':
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            break;
          case 'Profil':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }
        return <Ionicons name={iconName!} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.FAMILY_PRIMARY,
      tabBarInactiveTintColor: colors.TEXT_MUTED,
      tabBarStyle: {
        backgroundColor: colors.SURFACE,
        borderTopColor: colors.BORDER,
        borderTopWidth: 1,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
    })}
  >
    <Tab.Screen
      name="Suivi"
      component={FamilyDashboard}
      options={{
        title: 'Suivi',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Historique"
      component={FamilyCareHistory}
      options={{
        title: 'Historique',
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagingScreen}
      options={{
        title: 'Messages',
        headerShown: false,
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: { backgroundColor: colors.DANGER },
      }}
    />
    <Tab.Screen
      name="Profil"
      component={FamilyProfile}
      options={{
        title: 'Profil',
        headerShown: false,
      }}
    />
  </Tab.Navigator>
  );
};

// Navigation principale
const AppNavigator = () => {
  const { user, userProfile, nurseProfile, loading } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCheckedForUserId, setOnboardingCheckedForUserId] = useState<string | null>(null);

  const currentUserType = userProfile?.user_type;

  console.log('[Onboarding][AppNavigator] render', {
    userId: user?.id,
    userType: currentUserType,
    verificationStatus: nurseProfile?.verification_status,
    verified: userProfile?.verified,
    showOnboarding,
    onboardingChecked,
    onboardingCheckedForUserId,
  });

  useEffect(() => {
    if (!user?.id || !currentUserType) {
      return;
    }
    // Avoid re-checking for the same user once already checked.
    if (onboardingCheckedForUserId === user.id) {
      return;
    }

    const storageKey = `soinlokal.onboarding.${currentUserType}.${user.id}`;

    const checkOnboarding = async () => {
      console.log('[Onboarding][AppNavigator] checking AsyncStorage key:', storageKey);
      try {
        const val = await AsyncStorage.getItem(storageKey);
        console.log('[Onboarding][AppNavigator] AsyncStorage value for', storageKey, '=', val);
        if (val !== 'completed') {
          console.log('[Onboarding][AppNavigator] -> showing onboarding tutorial');
          setShowOnboarding(true);
        } else {
          console.log('[Onboarding][AppNavigator] -> tutorial already completed for this user, not showing');
        }
      } catch (err) {
        console.log('[Onboarding][AppNavigator] AsyncStorage read error:', err);
      } finally {
        setOnboardingChecked(true);
        setOnboardingCheckedForUserId(user.id);
      }
    };

    checkOnboarding();
  }, [user?.id, currentUserType, onboardingCheckedForUserId]);

  const handleOnboardingClose = () => {
    console.log('[Onboarding][AppNavigator] onClose called, marking as completed for user', user?.id);
    if (user?.id && currentUserType) {
      const storageKey = `soinlokal.onboarding.${currentUserType}.${user.id}`;
      AsyncStorage.setItem(storageKey, 'completed')
        .then(() => console.log('[Onboarding][AppNavigator] AsyncStorage set completed for', storageKey))
        .catch(err => console.log('[Onboarding][AppNavigator] AsyncStorage set error:', err));
    }
    setShowOnboarding(false);
  };

  if (loading) {
    return <SplashScreen onAnimationComplete={() => {}} />;
  }

  const isNursePendingVerification =
    userProfile?.user_type === 'nurse' &&
    !userProfile?.verified &&
    nurseProfile?.verification_status !== 'verified';

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Utilisateur non connecté
            <>
              <Stack.Screen name="UserType" component={UserTypeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : userProfile?.is_admin ? (
            // Utilisateur admin — redirect vers le portail web
            <Stack.Screen name="AdminWebOnly" component={AdminWebOnlyScreen} />
          ) : isNursePendingVerification ? (
            // Infirmière en attente de vérification RPPS
            <Stack.Screen name="NursePendingVerification" component={NursePendingVerificationScreen} />
          ) : (
            // Utilisateur connecté
            <>
              {userProfile?.user_type === 'nurse' ? (
                <Stack.Screen name="NurseApp" component={NurseTabNavigator} />
              ) : userProfile?.user_type === 'family' ? (
                <Stack.Screen name="FamilyApp" component={FamilyTabNavigator} />
              ) : (
                <Stack.Screen name="PatientApp" component={PatientTabNavigator} />
              )}
              <Stack.Screen name="PatientDetail" component={PatientDetail} />
              <Stack.Screen name="CareHistory" component={CareHistoryScreen} />
              <Stack.Screen name="ExportData" component={ExportDataScreen} />
              <Stack.Screen name="AddManagedPatient" component={AddManagedPatient} />
              <Stack.Screen name="NurseProfileView" component={NurseProfileView} />
              <Stack.Screen name="ChatScreen" component={ChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {currentUserType && (
        <OnboardingModal
          visible={showOnboarding}
          userType={currentUserType}
          onClose={handleOnboardingClose}
        />
      )}
    </>
  );
};

export default AppNavigator;
