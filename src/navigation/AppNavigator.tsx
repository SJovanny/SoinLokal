import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../components/SplashScreen';

// Écrans d'authentification
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Écrans infirmière
import NurseDashboard from '../screens/nurse/NurseDashboard';
import PatientsList from '../screens/nurse/PatientsList';
import PatientDetail from '../screens/nurse/PatientDetail';
import TourneeScreen from '../screens/nurse/TourneeScreen';
import ProfileScreen from '../screens/nurse/ProfileScreen';

// Écrans patient
import PatientDashboard from '../screens/patient/PatientDashboard';
import PatientCareHistory from '../screens/patient/PatientCareHistory';
import MessagingScreen from '../screens/shared/MessagingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation pour les infirmières
const NurseTabNavigator = () => (
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
      tabBarActiveTintColor: '#2E8B57',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: 'white',
        borderTopColor: '#e0e0e0',
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
        headerShown: false
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

// Navigation pour les patients
const PatientTabNavigator = () => (
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
        }
        return <Ionicons name={iconName!} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4A90E2',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: 'white',
        borderTopColor: '#e0e0e0',
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
        headerShown: false
      }}
    />
  </Tab.Navigator>
);

// Navigation principale
const AppNavigator = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <SplashScreen onAnimationComplete={() => {}} />;
  }

  return (
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
        ) : (
          // Utilisateur connecté
          <>
            {userProfile?.user_type === 'nurse' ? (
              <Stack.Screen name="NurseApp" component={NurseTabNavigator} />
            ) : (
              <Stack.Screen name="PatientApp" component={PatientTabNavigator} />
            )}
            <Stack.Screen name="PatientDetail" component={PatientDetail} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
