import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import { getColors } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';
import DoctorIllustration from '../../../assets/Doctors-bro.svg';
import WheelchairIllustration from '../../../assets/Hospital wheelchair-rafiki.svg';

const { width, height } = Dimensions.get('window');

const UserTypeScreen = ({ navigation }: { navigation: any }) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tileOpacity = useRef(new Animated.Value(0)).current;
  const nurseSlideX = useRef(new Animated.Value(-40)).current;
  const nurseOpacity = useRef(new Animated.Value(0)).current;
  const patientSlideX = useRef(new Animated.Value(40)).current;
  const patientOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const nurseFlashOpacity = useRef(new Animated.Value(0)).current;
  const patientFlashOpacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isAnimating = useRef(false);

  const playEntranceAnimation = useCallback(() => {
    tileOpacity.setValue(0);
    nurseSlideX.setValue(-40);
    nurseOpacity.setValue(0);
    patientSlideX.setValue(40);
    patientOpacity.setValue(0);
    nurseFlashOpacity.setValue(0);
    patientFlashOpacity.setValue(0);

    timeoutIds.current.push(
      setTimeout(() => {
        Animated.spring(tileOpacity, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 200),
    );

    timeoutIds.current.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(nurseOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(nurseSlideX, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(patientOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(patientSlideX, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400),
    );
  }, [tileOpacity, nurseSlideX, nurseOpacity, patientSlideX, patientOpacity, nurseFlashOpacity, patientFlashOpacity]);

  useEffect(() => {
    if (isFocused) {
      playEntranceAnimation();
    }
    return () => {
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current = [];
    };
  }, [isFocused, playEntranceAnimation]);

  const handleRoleSelect = (type: 'nurse' | 'patient') => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const flashTarget = type === 'nurse' ? nurseFlashOpacity : patientFlashOpacity;

    Animated.sequence([
      Animated.timing(flashTarget, {
        toValue: 0.25,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashTarget, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1.03,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(tileOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(nurseOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(patientOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(() => {
      navigation.navigate('Login', { userType: type });
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: tileOpacity }]}
      >
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="nurseTile" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.NURSE_DARK} />
              <Stop offset="0.6" stopColor={colors.NURSE_PRIMARY} />
              <Stop offset="1" stopColor="#3CB371" />
            </SvgLinearGradient>
            <SvgLinearGradient id="patientTile" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.PATIENT_DARK} />
              <Stop offset="0.6" stopColor={colors.PATIENT_PRIMARY} />
              <Stop offset="1" stopColor="#64B5F6" />
            </SvgLinearGradient>
          </Defs>
          <Polygon
            points={`0,0 ${width},0 0,${height}`}
            fill="url(#nurseTile)"
            stroke="url(#nurseTile)"
            strokeWidth={0.5}
          />
          <Polygon
            points={`${width},0 ${width},${height} 0,${height}`}
            fill="url(#patientTile)"
            stroke="url(#patientTile)"
            strokeWidth={0.5}
          />
        </Svg>
      </Animated.View>

      {/* Flash — nurse triangle */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: nurseFlashOpacity },
        ]}
        pointerEvents="none"
      >
        <Svg width={width} height={height}>
          <Polygon
            points={`0,0 ${width},0 0,${height}`}
            fill="white"
          />
        </Svg>
      </Animated.View>

      {/* Flash — patient triangle */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: patientFlashOpacity },
        ]}
        pointerEvents="none"
      >
        <Svg width={width} height={height}>
          <Polygon
            points={`${width},0 ${width},${height} 0,${height}`}
            fill="white"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentWrapper,
          { transform: [{ scale: contentScale }] },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Nurse — top left */}
          <Animated.View
            style={[
              styles.nurseContent,
              {
                opacity: nurseOpacity,
                transform: [{ translateX: nurseSlideX }],
              },
            ]}
          >
            <Pressable
              onPress={() => handleRoleSelect('nurse')}
              style={styles.nurseInner}
            >
              <Text style={styles.title}>Infirmière</Text>
              <Text style={styles.title}>libérale</Text>
              <Text style={styles.subtitle}>
                Gérez vos patients{'\n'}et tournées
              </Text>
              <DoctorIllustration
                width={200}
                height={200}
                style={styles.nurseIllustration}
              />
            </Pressable>
          </Animated.View>

          {/* Patient — bottom right */}
          <Animated.View
            style={[
              styles.patientContent,
              {
                opacity: patientOpacity,
                transform: [{ translateX: patientSlideX }],
              },
            ]}
          >
            <Pressable
              onPress={() => handleRoleSelect('patient')}
              style={styles.patientInner}
            >
              <Text style={[styles.title, styles.patientTitle]}>Patient</Text>
              <Text style={[styles.title, styles.patientTitle]}>/ Famille</Text>
              <Text style={[styles.subtitle, styles.patientSubtitle]}>
                Suivez vos soins{'\n'}et rendez-vous
              </Text>
              <WheelchairIllustration
                width={200}
                height={200}
                style={styles.patientIllustration}
              />
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: tileOpacity }]}>
        Sécurisé • Certifié • RGPD
      </Animated.Text>
    </View>
  );
};

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.NURSE_DARK,
  },
  contentWrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  nurseContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '55%',
    height: '55%',
  },
  nurseInner: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingLeft: width * 0.05,
    paddingTop: height * 0.08,
  },
  nurseIllustration: {
    marginTop: 14,
    opacity: 0.9,
  },
  patientContent: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '55%',
    height: '55%',
  },
  patientInner: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: width * 0.05,
    paddingBottom: height * 0.08,
  },
  patientIllustration: {
    marginTop: 14,
    opacity: 0.9,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: 'white',
    lineHeight: 38,
  },
  patientTitle: {
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    lineHeight: 22,
  },
  patientSubtitle: {
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  });
}

export default UserTypeScreen;
