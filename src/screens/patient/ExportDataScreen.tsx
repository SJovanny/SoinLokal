import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { buildPatientExportData } from '../../utils/dataExport';
import { exportPatientDossierToPDF } from '../../utils/pdfExport';
import { getColors, SIZES } from '../../utils/constants';
import type { Appointment } from '../../utils/supabase';

const ExportDataScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, userProfile, patientProfile } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'pdf' | 'json' | null>(null);

  const handleExportPDF = async () => {
    if (!user || !userProfile || !patientProfile) {
      Alert.alert(
        'Profil incomplet',
        'Votre profil patient est incomplet. Veuillez le compléter avant export.',
      );
      return;
    }

    setLoading(true);
    setLoadingType('pdf');
    try {
      const exportData = await buildPatientExportData(user.id);
      await exportPatientDossierToPDF({
        profile: userProfile,
        patientProfile,
        appointments: exportData.appointments as unknown as Appointment[],
        accentColor: colors.PATIENT_PRIMARY,
      });
    } catch (err) {
      Alert.alert(
        'Erreur',
        "Une erreur est survenue lors de l'export PDF. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleExportJSON = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }

    setLoading(true);
    setLoadingType('json');
    try {
      const exportData = await buildPatientExportData(user.id);
      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `soinlokal-export-${new Date().toISOString().slice(0, 10)}.json`;

      if (!FileSystem.cacheDirectory) {
        Alert.alert('Erreur', 'Répertoire de cache inaccessible.');
        return;
      }

      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export de vos données',
          UTI: 'public.json',
        });
      } else {
        Alert.alert(
          'Fichier généré',
          `Le fichier a été enregistré : ${fileName}`,
        );
      }
    } catch (err) {
      Alert.alert(
        'Erreur',
        "Une erreur est survenue lors de l'export JSON. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.PATIENT_PRIMARY} />
        <Text style={styles.loadingText}>
          {loadingType === 'pdf'
            ? 'Génération du dossier PDF...'
            : 'Préparation de l\'export JSON...'}
        </Text>
        <Text style={styles.loadingSubtext}>
          Cette opération peut prendre quelques instants.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.PATIENT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exporter mes données</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoCardIcon}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.PATIENT_PRIMARY} />
          </View>
          <Text style={styles.infoCardText}>
            Conformément au RGPD (droit à la portabilité), vous pouvez exporter
            toutes vos données personnelles. Les exports contiennent votre
            profil, historique de soins et messages.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleExportPDF}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="document-text-outline" size={32} color={colors.PATIENT_PRIMARY} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Exporter en PDF</Text>
            <Text style={styles.optionDescription}>
              Dossier lisible incluant profil, soins et historique
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.TEXT_MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleExportJSON}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="code-outline" size={32} color={colors.PATIENT_PRIMARY} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Exporter en JSON</Text>
            <Text style={styles.optionDescription}>
              Format brut pour importation dans une autre application
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.TEXT_MUTED} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.MD,
    paddingTop: 60,
    backgroundColor: colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: colors.PATIENT_PRIMARY,
  },
  backButton: {
    padding: SIZES.XS,
  },
  headerPlaceholder: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: colors.PATIENT_LIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.XL,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: colors.PATIENT_PRIMARY,
  },
  infoCardIcon: {
    marginRight: SIZES.SM,
    marginTop: 2,
  },
  infoCardText: {
    flex: 1,
    fontSize: SIZES.FONT_SM,
    color: colors.TEXT_PRIMARY,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: colors.WHITE,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.MD,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    backgroundColor: colors.PATIENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.MD,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: SIZES.FONT_XS,
    color: colors.TEXT_SECONDARY,
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.XL,
  },
  loadingText: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '600',
    color: colors.TEXT_PRIMARY,
    marginTop: SIZES.MD,
  },
  loadingSubtext: {
    fontSize: SIZES.FONT_SM,
    color: colors.TEXT_MUTED,
    marginTop: SIZES.XS,
  },
  });
}

export default ExportDataScreen;
