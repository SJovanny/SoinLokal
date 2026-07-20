import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, SIZES, getThemeColor } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FAQItem {
  question: string;
  answer: string;
}

interface HelpSectionProps {
  userType: 'nurse' | 'patient' | 'family';
  onRestartTutorial: () => void;
}

// ---------------------------------------------------------------------------
// FAQ data by role
// ---------------------------------------------------------------------------

const NURSE_FAQ: FAQItem[] = [
  {
    question: 'Comment modifier mon profil ?',
    answer:
      'Allez dans l\'onglet Profil, puis appuyez sur l\'icône crayon en haut à droite. Modifiez vos informations puis appuyez sur « Enregistrer ».',
  },
  {
    question: 'Comment ajouter un patient ?',
    answer:
      'Onglet Patients, appuyez sur le bouton « + » en haut. Recherchez le patient par nom ou téléphone, ou créez un nouveau dossier.',
  },
  {
    question: 'Comment fonctionne la tournée ?',
    answer:
      'L\'application calcule automatiquement l\'itinéraire le plus efficace pour vos visites. Ajoutez vos rendez-vous, puis suivez le parcours sur la carte. Vous pouvez lancer la navigation GPS directement depuis l\'app.',
  },
  {
    question: 'Comment marquer un soin terminé ?',
    answer:
      'Dans la tournée, appuyez sur le rendez-vous puis sur « Terminer ». Remplissez les notes de soin (soins réalisés, observations, remarques) et validez.',
  },
  {
    question: 'Comment contacter le support ?',
    answer:
      'Pour toute question ou problème technique, envoyez un email à support@soinlokal.mq (adresse à confirmer). L\'application est en cours de développement.',
  },
];

const PATIENT_FAQ: FAQItem[] = [
  {
    question: 'Comment modifier mon profil ?',
    answer:
      'Allez dans l\'onglet Profil, appuyez sur l\'icône crayon en haut à droite. Modifiez vos informations (nom, téléphone, adresse, contact d\'urgence) puis « Enregistrer ».',
  },
  {
    question: 'Comment voir mes prochains rendez-vous ?',
    answer:
      'L\'onglet Accueil affiche vos prochains rendez-vous avec la date, l\'heure et le type de soin. Vous pouvez aussi consulter vos soins récents.',
  },
  {
    question: 'Comment contacter mon infirmière ?',
    answer:
      'Onglet Messages, sélectionnez la conversation avec votre infirmière. Vous pouvez lui envoyer des messages en toute confidentialité.',
  },
  {
    question: 'Comment contacter le support ?',
    answer:
      'Pour toute question ou problème technique, envoyez un email à support@soinlokal.mq (adresse à confirmer). L\'application est en cours de développement.',
  },
];

const FAMILY_FAQ: FAQItem[] = [
  {
    question: 'Comment suivre les soins de mon proche ?',
    answer:
      'L\'onglet Suivi affiche les prochains rendez-vous et l\'historique des soins de votre proche. Vous pouvez consulter les détails de chaque soin.',
  },
  {
    question: 'Comment contacter l\'infirmière ?',
    answer:
      'Onglet Messages, vous pouvez échanger directement avec l\'infirmière qui s\'occupe de votre proche.',
  },
  {
    question: 'Comment ajouter un proche ?',
    answer:
      'Dans votre Profil, appuyez sur « Ajouter un proche ». Vous pouvez créer un dossier pour une personne que vous accompagnez ou lier un dossier existant.',
  },
  {
    question: 'Comment contacter le support ?',
    answer:
      'Pour toute question ou problème technique, envoyez un email à support@soinlokal.mq (adresse à confirmer). L\'application est en cours de développement.',
  },
];

// ---------------------------------------------------------------------------
// FAQ Accordion Item
// ---------------------------------------------------------------------------

function FAQItem({
  item,
  isOpen,
  onToggle,
  themeColor,
  colors,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  themeColor: string;
  colors: ReturnType<typeof getColors>;
}) {
  const faq = useMemo(() => createFaqStyles(colors), [colors]);
  const height = useRef(new RNAnimated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    RNAnimated.timing(height, {
      toValue: isOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const animatedHeight = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={faq.item}>
      <TouchableOpacity style={faq.row} onPress={onToggle} activeOpacity={0.7}>
        <Ionicons
          name={isOpen ? 'help-circle' : 'help-circle-outline'}
          size={20}
          color={isOpen ? themeColor : colors.TEXT_MUTED}
        />
        <Text style={[faq.q, isOpen && { color: themeColor }]}>{item.question}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isOpen ? themeColor : colors.TEXT_MUTED}
        />
      </TouchableOpacity>
      <RNAnimated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        <View style={faq.answer}>
          <Text style={faq.a}>{item.answer}</Text>
        </View>
      </RNAnimated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HelpSection({ userType, onRestartTutorial }: HelpSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const hs = useMemo(() => createHsStyles(colors), [colors]);
  const themeColor = getThemeColor(userType);

  const faqItems = userType === 'nurse' ? NURSE_FAQ
    : userType === 'family' ? FAMILY_FAQ
    : PATIENT_FAQ;

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <View style={hs.section}>
      <View style={hs.header}>
        <Ionicons name="help-circle" size={22} color={themeColor} />
        <Text style={hs.title}>Aide & Support</Text>
      </View>

      {faqItems.map((item, i) => (
        <FAQItem
          key={i}
          item={item}
          isOpen={openIndex === i}
          onToggle={() => handleToggle(i)}
          themeColor={themeColor}
          colors={colors}
        />
      ))}

      <TouchableOpacity
        style={[hs.restart, { borderColor: themeColor }]}
        onPress={onRestartTutorial}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={18} color={themeColor} />
        <Text style={[hs.restartTxt, { color: themeColor }]}>Relancer le tutoriel</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createHsStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      marginBottom: SIZES.MD,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.SM,
      marginBottom: SIZES.MD,
    },
    title: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    restart: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.SM,
      paddingVertical: SIZES.MD,
      marginTop: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
    },
    restartTxt: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
    },
  });
}

function createFaqStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    item: {
      borderRadius: SIZES.BORDER_RADIUS_SM,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SIZES.SM,
      gap: SIZES.SM,
    },
    q: {
      flex: 1,
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
    },
    answer: {
      paddingLeft: 28,
      paddingBottom: SIZES.SM,
    },
    a: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
      lineHeight: 20,
    },
  });
}
