import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, getThemeColor } from '../utils/constants';
import {
  NURSE_SLIDES,
  PATIENT_SLIDES,
  FAMILY_SLIDES,
  NURSE_MOCK,
  PATIENT_MOCK,
  FAMILY_MOCK,
  type OnboardingSlide,
} from './OnboardingMockData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingModalProps {
  visible: boolean;
  userType: 'nurse' | 'patient' | 'family';
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const SLIDE_PADDING = SIZES.XL;
const PREVIEW_WIDTH = CARD_WIDTH - SLIDE_PADDING * 2;

// ---------------------------------------------------------------------------
// Mock Preview Components
// ---------------------------------------------------------------------------

function WelcomePreview({ themeColor }: { themeColor: string }) {
  return (
    <View style={[pv.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={[pv.welcomeCircle, { backgroundColor: themeColor + '12' }]}>
        <View style={[pv.welcomeCircleInner, { backgroundColor: themeColor + '20' }]}>
          <Ionicons name="medical" size={48} color={themeColor} />
        </View>
      </View>
      <Text style={[pv.welcomeTitle, { color: themeColor }]}>SoinLokal</Text>
      <Text style={pv.welcomeSub}>Soins à domicile en Martinique</Text>
    </View>
  );
}

function NurseDashboardPreview() {
  const m = NURSE_MOCK;
  return (
    <View style={pv.container}>
      <View style={pv.statsRow}>
        <PvStat icon="people-outline" value={String(m.stats.patients)} label="Patients" color={COLORS.NURSE_PRIMARY} />
        <PvStat icon="calendar-outline" value={String(m.stats.visitesToday)} label="Visites" color={COLORS.PATIENT_PRIMARY} />
        <PvStat icon="checkmark-circle-outline" value={String(m.stats.terminees)} label="Terminées" color={COLORS.SUCCESS} />
      </View>
      {m.appointments.slice(0, 3).map((a, i) => (
        <View key={i} style={[pv.apptRow, a.status === 'completed' && pv.completedRow]}>
          <View style={{ flex: 1 }}>
            <Text style={pv.name}>{a.name}</Text>
            <Text style={pv.sub}>{a.care}</Text>
          </View>
          <Text style={pv.time}>{a.time}</Text>
        </View>
      ))}
    </View>
  );
}

function NursePatientsPreview() {
  const patients = ['Marie Beaumont', 'Joseph Fanfan', 'Lucie Saint-Cyr', 'André Moreau'];
  return (
    <View style={pv.container}>
      {patients.map((name, i) => (
        <View key={i} style={pv.patientRow}>
          <View style={pv.avatar}>
            <Text style={pv.avatarTxt}>{name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pv.name}>{name}</Text>
            <Text style={pv.sub}>Dossier actif</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_MUTED} />
        </View>
      ))}
    </View>
  );
}

function TourneePreview() {
  const stops = [
    { name: 'Beaumont',      time: '08:30', x: 25, y: 20 },
    { name: 'Fanfan',        time: '09:15', x: 60, y: 35 },
    { name: 'Saint-Cyr',     time: '10:00', x: 40, y: 55 },
    { name: 'Moreau',        time: '11:00', x: 75, y: 70 },
  ];

  return (
    <View style={pv.container}>
      {/* Map area */}
      <View style={pv.mapArea}>
        {/* Grid lines to simulate map */}
        <View style={pv.mapGrid}>
          {[0.2, 0.4, 0.6, 0.8].map((p) => (
            <React.Fragment key={p}>
              <View style={[pv.gridH, { top: `${p * 100}%` }]} />
              <View style={[pv.gridV, { left: `${p * 100}%` }]} />
            </React.Fragment>
          ))}
        </View>

        {/* Route line connecting stops */}
        <View style={pv.routeLineContainer}>
          {stops.map((s, i) => {
            if (i === stops.length - 1) return null;
            const next = stops[i + 1];
            return (
              <View
                key={i}
                style={[
                  pv.routeSegment,
                  {
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: Math.sqrt(
                      Math.pow((next.x - s.x) * (PREVIEW_WIDTH - 32) / 100, 2) +
                      Math.pow((next.y - s.y) * 140 / 100, 2)
                    ),
                    transform: [
                      { rotate: `${Math.atan2(next.y - s.y, next.x - s.x) * 180 / Math.PI}deg` },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Patient pins */}
        {stops.map((s, i) => (
          <View
            key={i}
            style={[
              pv.pin,
              { left: `${s.x}%`, top: `${s.y}%` },
            ]}
          >
            <View style={[pv.pinDot, i === 0 && pv.pinDotActive]}>
              <Text style={pv.pinNum}>{i + 1}</Text>
            </View>
            <View style={pv.pinTail} />
          </View>
        ))}

        {/* Street names */}
        <Text style={[pv.streetName, { top: '15%', left: '10%' }]}>Rue des Lilas</Text>
        <Text style={[pv.streetName, { top: '48%', left: '55%', transform: [{ rotate: '-15deg' }] }]}>Blvd Liberté</Text>
        <Text style={[pv.streetName, { top: '80%', left: '15%' }]}>Rue Victor Hugo</Text>
      </View>

      {/* Stop list */}
      <View style={pv.stopList}>
        {stops.map((s, i) => (
          <View key={i} style={pv.stopRow}>
            <View style={[pv.stopNum, i === 0 && pv.stopNumActive]}>
              <Text style={[pv.stopNumTxt, i === 0 && { color: COLORS.WHITE }]}>{i + 1}</Text>
            </View>
            <Text style={pv.stopName}>{s.name}</Text>
            <Text style={pv.stopTime}>{s.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MessagesPreview({ userType }: { userType: 'nurse' | 'patient' | 'family' }) {
  const convos = userType === 'nurse' ? NURSE_MOCK.conversations
    : userType === 'patient' ? PATIENT_MOCK.conversations
    : FAMILY_MOCK.conversations;
  return (
    <View style={pv.container}>
      {convos.map((c, i) => (
        <View key={i} style={pv.convo}>
          <View style={pv.avatar}>
            <Text style={pv.avatarTxt}>{c.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={pv.convoTop}>
              <Text style={pv.name}>{c.name}</Text>
              <Text style={pv.sub}>{c.time}</Text>
            </View>
            <Text style={pv.msg} numberOfLines={1}>{c.lastMsg}</Text>
          </View>
          {c.unread > 0 && (
            <View style={pv.badge}>
              <Text style={pv.badgeTxt}>{c.unread}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ProfilePreview() {
  return (
    <View style={pv.container}>
      <View style={pv.profCard}>
        <View style={pv.profAvatar}>
          <Ionicons name="person" size={28} color={COLORS.NURSE_PRIMARY} />
        </View>
        <Text style={pv.profName}>Marie Laurent</Text>
        <Text style={pv.profRole}>Infirmière libérale</Text>
      </View>
      <View style={pv.profSec}>
        <PvInfo icon="call-outline" label="Téléphone" value="0696 12 34 56" />
        <PvInfo icon="medical-outline" label="Spécialités" value="Soins généraux" />
        <PvInfo icon="map-outline" label="Zone" value="Fort-de-France" />
      </View>
    </View>
  );
}

function PatientDashboardPreview() {
  const m = PATIENT_MOCK;
  return (
    <View style={pv.container}>
      <View style={pv.statsRow}>
        <PvStat icon="calendar-outline" value={String(m.stats.prochainsRDV)} label="RDV" color={COLORS.PATIENT_PRIMARY} />
        <PvStat icon="heart-outline" value={String(m.stats.soinsRecus)} label="Soins" color={COLORS.SUCCESS} />
        <PvStat icon="chatbubble-outline" value={String(m.stats.messages)} label="Messages" color={COLORS.WARNING} />
      </View>
      {m.appointments.slice(0, 2).map((a, i) => (
        <View key={i} style={pv.apptRow}>
          <View style={{ flex: 1 }}>
            <Text style={pv.name}>{a.care}</Text>
            <Text style={pv.sub}>{a.nurse}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={pv.time}>{a.time}</Text>
            <Text style={pv.sub}>{a.date}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SuiviPreview() {
  const m = FAMILY_MOCK;
  return (
    <View style={pv.container}>
      <View style={pv.suiviTop}>
        <View style={pv.avatarLg}>
          <Text style={pv.avatarTxtLg}>{m.patient.firstName.charAt(0)}</Text>
        </View>
        <View>
          <Text style={pv.name}>{m.patient.firstName} {m.patient.lastName}</Text>
          <Text style={pv.sub}>{m.patient.nurse}</Text>
        </View>
      </View>
      {m.appointments.map((a, i) => (
        <View key={i} style={pv.apptRow}>
          <View style={{ flex: 1 }}>
            <Text style={pv.name}>{a.care}</Text>
            <Text style={pv.sub}>{a.date}</Text>
          </View>
          <Text style={pv.time}>{a.time}</Text>
        </View>
      ))}
    </View>
  );
}

function getPreview(type: string, userType: string, themeColor: string) {
  switch (type) {
    case 'welcome':   return <WelcomePreview themeColor={themeColor} />;
    case 'dashboard': return userType === 'nurse' ? <NurseDashboardPreview /> : <PatientDashboardPreview />;
    case 'patients':  return <NursePatientsPreview />;
    case 'tournee':   return <TourneePreview />;
    case 'messages':  return <MessagesPreview userType={userType as any} />;
    case 'profile':   return <ProfilePreview />;
    case 'suivi':     return <SuiviPreview />;
    default:          return null;
  }
}

function PvStat({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={pv.stat}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[pv.statVal, { color }]}>{value}</Text>
      <Text style={pv.statLbl}>{label}</Text>
    </View>
  );
}

function PvInfo({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={pv.info}>
      <Ionicons name={icon as any} size={16} color={COLORS.TEXT_MUTED} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={pv.infoLbl}>{label}</Text>
        <Text style={pv.infoVal}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated Slide Wrapper
// ---------------------------------------------------------------------------

function AnimatedSlide({
  slide,
  index,
  activeIndex,
  userType,
  themeColor,
}: {
  slide: OnboardingSlide;
  index: number;
  activeIndex: number;
  userType: string;
  themeColor: string;
}) {
  const iconScale = useRef(new RNAnimated.Value(0)).current;
  const titleOp = useRef(new RNAnimated.Value(0)).current;
  const titleY = useRef(new RNAnimated.Value(20)).current;
  const descOp = useRef(new RNAnimated.Value(0)).current;
  const previewScale = useRef(new RNAnimated.Value(0.9)).current;
  const previewOp = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (activeIndex === index) {
      iconScale.setValue(0);
      titleOp.setValue(0);
      titleY.setValue(20);
      descOp.setValue(0);
      previewScale.setValue(0.9);
      previewOp.setValue(0);

      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.spring(iconScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
          RNAnimated.timing(titleOp, { toValue: 1, duration: 350, useNativeDriver: true }),
          RNAnimated.spring(titleY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(descOp, { toValue: 1, duration: 300, useNativeDriver: true }),
          RNAnimated.parallel([
            RNAnimated.spring(previewScale, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
            RNAnimated.timing(previewOp, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    } else {
      iconScale.setValue(0);
      titleOp.setValue(0);
      titleY.setValue(20);
      descOp.setValue(0);
      previewScale.setValue(0.9);
      previewOp.setValue(0);
    }
  }, [activeIndex, index]);

  return (
    <View style={st.slide}>
      <RNAnimated.View style={[st.iconWrap, { backgroundColor: themeColor + '15' }, { transform: [{ scale: iconScale }] }]}>
        <Ionicons name={slide.icon} size={48} color={themeColor} />
      </RNAnimated.View>

      <RNAnimated.Text style={[st.title, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
        {slide.title}
      </RNAnimated.Text>
      <RNAnimated.Text style={[st.desc, { opacity: descOp }]}>
        {slide.description}
      </RNAnimated.Text>

      <RNAnimated.View style={[st.preview, { opacity: previewOp, transform: [{ scale: previewScale }] }]}>
        {getPreview(slide.previewType, userType, themeColor)}
      </RNAnimated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dot
// ---------------------------------------------------------------------------

function Dot({ active, themeColor }: { active: boolean; themeColor: string }) {
  const w = useRef(new RNAnimated.Value(active ? 24 : 8)).current;

  useEffect(() => {
    RNAnimated.spring(w, { toValue: active ? 24 : 8, tension: 120, friction: 10, useNativeDriver: false }).start();
  }, [active]);

  return <RNAnimated.View style={[dt.dot, { width: w, backgroundColor: active ? themeColor : COLORS.BORDER }]} />;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OnboardingModal({ visible, userType, onClose }: OnboardingModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const themeColor = getThemeColor(userType);

  const slides = userType === 'nurse' ? NURSE_SLIDES
    : userType === 'family' ? FAMILY_SLIDES
    : PATIENT_SLIDES;

  const isLast = activeIndex === slides.length - 1;

  // Pulse on last button
  const btnScale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (isLast && visible) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(btnScale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          RNAnimated.timing(btnScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      btnScale.setValue(1);
    }
  }, [isLast, visible]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    const next = activeIndex + 1;
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
  }, [activeIndex, isLast, onClose]);

  const handlePrev = useCallback(() => {
    if (activeIndex === 0) return;
    const prev = activeIndex - 1;
    setActiveIndex(prev);
    scrollRef.current?.scrollTo({ x: prev * CARD_WIDTH, animated: true });
  }, [activeIndex]);

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (idx !== activeIndex) setActiveIndex(idx);
  }, [activeIndex]);

  const handleSkip = useCallback(() => { onClose(); }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={mo.overlay}>
        <View style={mo.card}>
          {/* Skip */}
          {!isLast && (
            <TouchableOpacity style={mo.skip} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={[mo.skipTxt, { color: themeColor }]}>Passer</Text>
            </TouchableOpacity>
          )}

          {/* Slides */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            onMomentumScrollEnd={handleScroll}
            style={{ flexGrow: 0 }}
          >
            {slides.map((slide, i) => (
              <View key={i} style={{ width: CARD_WIDTH }}>
                <AnimatedSlide
                  slide={slide}
                  index={i}
                  activeIndex={activeIndex}
                  userType={userType}
                  themeColor={themeColor}
                />
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={mo.dots}>
            {slides.map((_, i) => (
              <Dot key={i} active={i === activeIndex} themeColor={themeColor} />
            ))}
          </View>

          {/* Nav */}
          <View style={mo.nav}>
            {activeIndex > 0 ? (
              <TouchableOpacity style={mo.navBtn} onPress={handlePrev} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={COLORS.TEXT_SECONDARY} />
                <Text style={mo.navTxt}>Précédent</Text>
              </TouchableOpacity>
            ) : (
              <View style={mo.navBtn} />
            )}

            <RNAnimated.View style={isLast ? { transform: [{ scale: btnScale }] } : undefined}>
              <TouchableOpacity
                style={[mo.next, { backgroundColor: themeColor }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={mo.nextTxt}>{isLast ? 'Commencer !' : 'Suivant'}</Text>
                {!isLast && <Ionicons name="chevron-forward" size={18} color={COLORS.WHITE} />}
              </TouchableOpacity>
            </RNAnimated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const mo = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    maxHeight: SCREEN_HEIGHT - 100,
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_LG,
    overflow: 'hidden',
    paddingTop: SIZES.XL,
  },
  skip: {
    position: 'absolute',
    top: SIZES.MD,
    right: SIZES.MD,
    zIndex: 10,
    paddingVertical: SIZES.XS,
    paddingHorizontal: SIZES.MD,
  },
  skipTxt: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SIZES.MD,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.LG,
    paddingBottom: SIZES.XL,
    gap: SIZES.MD,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.MD,
  },
  navTxt: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.MD,
    paddingHorizontal: SIZES.XL,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    gap: SIZES.XS,
  },
  nextTxt: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.WHITE,
  },
});

const st = StyleSheet.create({
  slide: {
    alignItems: 'center',
    paddingHorizontal: SLIDE_PADDING,
    minHeight: 420,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.LG,
  },
  title: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SIZES.SM,
  },
  desc: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZES.LG,
    paddingHorizontal: SIZES.MD,
  },
  preview: {
    width: PREVIEW_WIDTH,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignSelf: 'center',
  },
});

const dt = StyleSheet.create({
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

// ---------------------------------------------------------------------------
// Preview styles
// ---------------------------------------------------------------------------

const pv = StyleSheet.create({
  container: {
    padding: SIZES.MD,
    minHeight: 220,
  },
  // Welcome
  welcomeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.LG,
  },
  welcomeCircleInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: SIZES.FONT_2XL,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.MD,
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
  },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: SIZES.FONT_LG, fontWeight: '700' },
  statLbl: { fontSize: 10, color: COLORS.TEXT_MUTED },
  // Appointments
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    gap: SIZES.SM,
    marginBottom: 6,
  },
  completedRow: { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: COLORS.SUCCESS },
  name: { fontSize: SIZES.FONT_SM, fontWeight: '600', color: COLORS.TEXT_PRIMARY },
  sub: { fontSize: SIZES.FONT_XS, color: COLORS.TEXT_MUTED },
  time: { fontSize: SIZES.FONT_SM, fontWeight: '600', color: COLORS.TEXT_PRIMARY },
  // Patients
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM,
    gap: SIZES.SM,
    marginBottom: 6,
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: SIZES.FONT_SM, fontWeight: '700', color: COLORS.NURSE_PRIMARY },
  // Map / Tournée
  mapArea: {
    height: 140,
    backgroundColor: '#E8F0E8',
    borderRadius: SIZES.BORDER_RADIUS_SM,
    overflow: 'hidden',
    marginBottom: SIZES.SM,
    position: 'relative',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,100,0,0.08)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,100,0,0.08)',
  },
  routeLineContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  routeSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: COLORS.NURSE_PRIMARY,
    borderRadius: 2,
    opacity: 0.6,
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -10,
    marginTop: -20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.NURSE_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  pinDotActive: {
    backgroundColor: COLORS.DANGER,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pinNum: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.WHITE,
  },
  pinTail: {
    width: 2,
    height: 6,
    backgroundColor: COLORS.NURSE_PRIMARY,
    opacity: 0.4,
  },
  streetName: {
    position: 'absolute',
    fontSize: 8,
    color: 'rgba(0,80,0,0.35)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  stopList: {
    gap: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.SM,
    paddingVertical: 4,
    paddingHorizontal: SIZES.XS,
  },
  stopNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumActive: {
    backgroundColor: COLORS.DANGER,
  },
  stopNumTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
  },
  stopName: {
    flex: 1,
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  stopTime: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
  },
  // Conversations
  convo: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.WHITE, borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM, gap: SIZES.SM, marginBottom: 6,
  },
  convoTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  msg: { fontSize: SIZES.FONT_XS, color: COLORS.TEXT_SECONDARY },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.DANGER,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: COLORS.WHITE },
  // Profile
  profCard: {
    backgroundColor: COLORS.WHITE, borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.MD, alignItems: 'center', marginBottom: SIZES.SM,
  },
  profAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.NURSE_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.XS,
  },
  profName: { fontSize: SIZES.FONT_MD, fontWeight: '700', color: COLORS.TEXT_PRIMARY },
  profRole: { fontSize: SIZES.FONT_XS, color: COLORS.NURSE_PRIMARY, fontWeight: '600' },
  profSec: {
    backgroundColor: COLORS.WHITE, borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM, gap: SIZES.SM,
  },
  info: { flexDirection: 'row', alignItems: 'center' },
  infoLbl: { fontSize: 10, color: COLORS.TEXT_MUTED },
  infoVal: { fontSize: SIZES.FONT_XS, color: COLORS.TEXT_PRIMARY, fontWeight: '500' },
  // Suivi
  suiviTop: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.WHITE, borderRadius: SIZES.BORDER_RADIUS_SM,
    padding: SIZES.SM, gap: SIZES.SM, marginBottom: SIZES.SM,
  },
  avatarLg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.FAMILY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxtLg: { fontSize: SIZES.FONT_MD, fontWeight: '700', color: COLORS.FAMILY_PRIMARY },
});
