import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { getColors, SIZES } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import SignatureModal from './SignatureModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CareNotesData {
  care_performed: string;
  observations: string;
  remarks: string;
  visible_to_patient: boolean;
  signature?: string;
}

interface CompletionModalProps {
  visible: boolean;
  patientName: string;
  careType: string;
  date: string;
  time: string | null;
  existingData?: Partial<CareNotesData>;
  onClose: () => void;
  onSave: (data: CareNotesData) => void;
  saving?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.substring(0, 5).replace(':', 'h');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompletionModal({
  visible,
  patientName,
  careType,
  date,
  time,
  existingData,
  onClose,
  onSave,
  saving = false,
}: CompletionModalProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [carePerformed, setCarePerformed] = useState('');
  const [observations, setObservations] = useState('');
  const [remarks, setRemarks] = useState('');
  const [visibleToPatient, setVisibleToPatient] = useState(false);
  const [signature, setSignature] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    if (visible) {
      setCarePerformed(existingData?.care_performed ?? '');
      setObservations(existingData?.observations ?? '');
      setRemarks(existingData?.remarks ?? '');
      setVisibleToPatient(existingData?.visible_to_patient ?? false);
      setSignature(existingData?.signature ?? '');
    }
  }, [visible, existingData]);

  const handleSave = () => {
    onSave({
      care_performed: carePerformed.trim(),
      observations: observations.trim(),
      remarks: remarks.trim(),
      visible_to_patient: visibleToPatient,
      signature: signature || undefined,
    });
  };

  const isEditing = !!existingData?.care_performed || !!existingData?.observations || !!existingData?.remarks;

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {isEditing ? 'Modifier les notes' : 'Soin terminé'}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.infoCard}>
                  <Text style={styles.infoName}>{patientName}</Text>
                  <Text style={styles.infoDetail}>
                    {careType} · {formatDate(date)}
                    {time ? ` · ${formatTime(time)}` : ''}
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Soins réalisés</Text>
                <TextInput
                  style={[styles.textArea, styles.textAreaSmall]}
                  placeholder="Décrivez les soins effectués..."
                  placeholderTextColor={colors.TEXT_MUTED}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={carePerformed}
                  onChangeText={setCarePerformed}
                />

                <Text style={styles.fieldLabel}>Observations</Text>
                <TextInput
                  style={[styles.textArea, styles.textAreaSmall]}
                  placeholder="État du patient, réactions, observations..."
                  placeholderTextColor={colors.TEXT_MUTED}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={observations}
                  onChangeText={setObservations}
                />

                <Text style={styles.fieldLabel}>Remarques</Text>
                <TextInput
                  style={[styles.textArea, styles.textAreaSmall]}
                  placeholder="Remarques complémentaires..."
                  placeholderTextColor={colors.TEXT_MUTED}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={remarks}
                  onChangeText={setRemarks}
                />

                <Text style={styles.fieldLabel}>Signature</Text>
                {signature ? (
                  <View style={styles.signaturePreview}>
                    <SvgXml xml={signature} width={200} height={90} />
                    <TouchableOpacity
                      style={styles.modifySignatureButton}
                      onPress={() => setShowSignature(true)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.NURSE_PRIMARY} />
                      <Text style={styles.modifySignatureText}>Modifier</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addSignatureButton}
                    onPress={() => setShowSignature(true)}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.NURSE_PRIMARY} />
                    <Text style={styles.addSignatureText}>Ajouter une signature</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Ionicons
                      name={visibleToPatient ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={visibleToPatient ? colors.NURSE_PRIMARY : colors.TEXT_MUTED}
                    />
                    <View style={styles.toggleTextBlock}>
                      <Text style={styles.toggleLabel}>Visible pour le patient</Text>
                      <Text style={styles.toggleHint}>
                        {visibleToPatient
                          ? 'Le patient verra ces notes dans son historique'
                          : 'Seul vous pouvez voir ces notes'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={visibleToPatient}
                    onValueChange={setVisibleToPatient}
                    trackColor={{ false: colors.BORDER, true: colors.NURSE_LIGHT }}
                    thumbColor={visibleToPatient ? colors.NURSE_PRIMARY : '#f4f3f4'}
                  />
                </View>
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? 'Enregistrement...' : 'Valider'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <SignatureModal
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={(svg) => {
          setSignature(svg);
          setShowSignature(false);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: SIZES.MD,
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'center',
    },
    content: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_LG,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SIZES.LG,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    headerTitle: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    scrollContent: {
      padding: SIZES.LG,
      paddingBottom: SIZES.XL,
    },
    // Info card
    infoCard: {
      backgroundColor: colors.NURSE_LIGHT,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      marginBottom: SIZES.LG,
    },
    infoName: {
      fontSize: SIZES.FONT_MD,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
      marginBottom: 2,
    },
    infoDetail: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
    },
    // Fields
    fieldLabel: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
      marginBottom: SIZES.XS,
      marginTop: SIZES.SM,
    },
    textArea: {
      backgroundColor: colors.WHITE,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      fontSize: SIZES.FONT_MD,
      color: colors.TEXT_PRIMARY,
    },
    textAreaSmall: {
      minHeight: 80,
      marginBottom: SIZES.SM,
    },
    // Toggle
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.BACKGROUND,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      padding: SIZES.MD,
      marginTop: SIZES.MD,
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: SIZES.MD,
    },
    toggleTextBlock: {
      marginLeft: SIZES.SM,
      flex: 1,
    },
    toggleLabel: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_PRIMARY,
    },
    toggleHint: {
      fontSize: SIZES.FONT_XS,
      color: colors.TEXT_MUTED,
      marginTop: 2,
    },
    // Actions
    actions: {
      flexDirection: 'row',
      gap: SIZES.SM,
      padding: SIZES.LG,
      borderTopWidth: 1,
      borderTopColor: colors.BORDER,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
    },
    saveButton: {
      flex: 1,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      backgroundColor: colors.NURSE_PRIMARY,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.WHITE,
    },
    addSignatureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.SM,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
      borderColor: colors.NURSE_PRIMARY,
      borderStyle: 'dashed',
      backgroundColor: colors.NURSE_LIGHT,
      marginBottom: SIZES.SM,
    },
    addSignatureText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.NURSE_PRIMARY,
    },
    signaturePreview: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
      padding: SIZES.SM,
      marginBottom: SIZES.SM,
      alignItems: 'center',
    },
    modifySignatureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZES.XS,
      marginTop: SIZES.XS,
    },
    modifySignatureText: {
      fontSize: SIZES.FONT_XS,
      fontWeight: '600',
      color: colors.NURSE_PRIMARY,
    },
  });
}
