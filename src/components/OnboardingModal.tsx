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
  Image,
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
const PREVIEW_WIDTH = SCREEN_WIDTH - 80;

// ---------------------------------------------------------------------------
// Mock Preview Components
// ---------------------------------------------------------------------------

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
  const stops = ['Beaumont', 'Fanfan', 'Saint-Cyr', 'Moreau'];
  return (
    <View style={pv.container}>
      <View style={pv.mapBox}>
        <Ionicons name="map" size={40} color={COLORS.NURSE_LIGHT} />
        <Text style={pv.mapTxt}>Carte interactive</Text>
      </View>
      {stops.map((name, i) => (
        <View key={i} style={pv.stop}>
          <View style={[pv.dot, i === 0 && pv.dotActive]} />
          <Text style={pv.stopName}>{name}</Text>
          <Text style={pv.stopTime}>{`${8 + i}:${30 + i * 45}`}</Text>
        </View>
      ))}
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

function getPreview(type: string, userType: string) {
  switch (type) {
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
        {getPreview(slide.previewType, userType)}
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
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  }, [activeIndex, isLast, onClose]);

  const handlePrev = useCallback(() => {
    if (activeIndex === 0) return;
    const prev = activeIndex - 1;
    setActiveIndex(prev);
    scrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
  }, [activeIndex]);

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
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
              <View key={i} style={{ width: SCREEN_WIDTH - 24 }}>
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
    width: SCREEN_WIDTH - 24,
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
    paddingHorizontal: SIZES.XL,
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
    width: PREVIEW_WIDTH - 24,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
  mapBox: {
    height: 100,
    backgroundColor: COLORS.NURSE_LIGHT,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.SM, gap: 4,
  },
  mapTxt: { fontSize: SIZES.FONT_XS, color: COLORS.NURSE_PRIMARY, fontWeight: '600' },
  stop: {
    flexDirection: 'row', alignItems: 'center',
    gap: SIZES.SM, paddingVertical: 4, paddingHorizontal: SIZES.SM,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.BORDER },
  dotActive: { backgroundColor: COLORS.NURSE_PRIMARY },
  stopName: { flex: 1, fontSize: SIZES.FONT_XS, color: COLORS.TEXT_PRIMARY, fontWeight: '500' },
  stopTime: { fontSize: SIZES.FONT_XS, color: COLORS.TEXT_MUTED },
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
