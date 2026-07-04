import React, { useState, useEffect } from 'react';
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
import { COLORS, SIZES } from '../utils/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CareNotesData {
  care_performed: string;
  observations: string;
  remarks: string;
  visible_to_patient: boolean;
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
  const [carePerformed, setCarePerformed] = useState('');
  const [observations, setObservations] = useState('');
  const [remarks, setRemarks] = useState('');
  const [visibleToPatient, setVisibleToPatient] = useState(false);

  useEffect(() => {
    if (visible) {
      setCarePerformed(existingData?.care_performed ?? '');
      setObservations(existingData?.observations ?? '');
      setRemarks(existingData?.remarks ?? '');
      setVisibleToPatient(existingData?.visible_to_patient ?? false);
    }
  }, [visible, existingData]);

  const handleSave = () => {
    onSave({
      care_performed: carePerformed.trim(),
      observations: observations.trim(),
      remarks: remarks.trim(),
      visible_to_patient: visibleToPatient,
    });
  };

  const isEditing = !!existingData?.care_performed || !!existingData?.observations || !!existingData?.remarks;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Modifier les notes' : 'Soin terminé'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Appointment info */}
              <View style={styles.infoCard}>
                <Text style={styles.infoName}>{patientName}</Text>
                <Text style={styles.infoDetail}>
                  {careType} · {formatDate(date)}
                  {time ? ` · ${formatTime(time)}` : ''}
                </Text>
              </View>

              {/* Soins réalisés */}
              <Text style={styles.fieldLabel}>Soins réalisés</Text>
              <TextInput
                style={[styles.textArea, styles.textAreaSmall]}
                placeholder="Décrivez les soins effectués..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={carePerformed}
                onChangeText={setCarePerformed}
              />

              {/* Observations */}
              <Text style={styles.fieldLabel}>Observations</Text>
              <TextInput
                style={[styles.textArea, styles.textAreaSmall]}
                placeholder="État du patient, réactions, observations..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={observations}
                onChangeText={setObservations}
              />

              {/* Remarques */}
              <Text style={styles.fieldLabel}>Remarques</Text>
              <TextInput
                style={[styles.textArea, styles.textAreaSmall]}
                placeholder="Remarques complémentaires..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={remarks}
                onChangeText={setRemarks}
              />

              {/* Visibility toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Ionicons
                    name={visibleToPatient ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={visibleToPatient ? COLORS.NURSE_PRIMARY : COLORS.TEXT_MUTED}
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
                  trackColor={{ false: COLORS.BORDER, true: COLORS.NURSE_LIGHT }}
                  thumbColor={visibleToPatient ? COLORS.NURSE_PRIMARY : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            {/* Actions */}
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
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.WHITE,
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
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  scrollContent: {
    padding: SIZES.LG,
    paddingBottom: SIZES.XL,
  },
  // Info card
  infoCard: {
    backgroundColor: COLORS.NURSE_LIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    marginBottom: SIZES.LG,
  },
  infoName: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  infoDetail: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.TEXT_SECONDARY,
  },
  // Fields
  fieldLabel: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.XS,
    marginTop: SIZES.SM,
  },
  textArea: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    padding: SIZES.MD,
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
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
    backgroundColor: COLORS.BACKGROUND,
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
    color: COLORS.TEXT_PRIMARY,
  },
  toggleHint: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: SIZES.SM,
    padding: SIZES.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    backgroundColor: COLORS.NURSE_PRIMARY,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});
