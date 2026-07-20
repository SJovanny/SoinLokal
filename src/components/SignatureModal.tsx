import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, SIZES } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { serializeSignatureToSVG, StrokeData } from '../utils/signatureStorage';

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

export default function SignatureModal({ visible, onClose, onSave }: SignatureModalProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const padRef = useRef<SignaturePadRef>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    padRef.current?.clear();
    setHasSignature(false);
  };

  const handleSave = () => {
    const strokes: StrokeData[] = padRef.current?.getSignatureData() ?? [];
    if (strokes.length === 0) return;
    const svg = serializeSignatureToSVG(strokes);
    onSave(svg);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Signature numérique</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.infoText}>
            Veuillez signer dans le cadre ci-dessous pour valider le soin
          </Text>

          <View style={styles.padCard}>
            <SignaturePad
              ref={padRef}
              onSignatureChange={setHasSignature}
              height={250}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="trash-outline" size={18} color={colors.TEXT_SECONDARY} />
            <Text style={styles.clearText}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !hasSignature && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!hasSignature}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.WHITE} />
            <Text style={styles.saveText}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
      paddingTop: 60,
      paddingBottom: SIZES.MD,
      backgroundColor: colors.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: colors.BORDER,
    },
    headerTitle: {
      fontSize: SIZES.FONT_LG,
      fontWeight: '700',
      color: colors.TEXT_PRIMARY,
    },
    body: {
      flex: 1,
      padding: SIZES.LG,
    },
    infoText: {
      fontSize: SIZES.FONT_SM,
      color: colors.TEXT_SECONDARY,
      textAlign: 'center',
      marginBottom: SIZES.LG,
    },
    padCard: {
      backgroundColor: colors.WHITE,
      borderRadius: SIZES.BORDER_RADIUS_LG,
      padding: SIZES.MD,
      elevation: 2,
      shadowColor: colors.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: SIZES.SM,
      paddingHorizontal: SIZES.LG,
      paddingBottom: SIZES.XL,
      paddingTop: SIZES.MD,
      backgroundColor: colors.WHITE,
      borderTopWidth: 1,
      borderTopColor: colors.BORDER,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.XS,
      paddingVertical: SIZES.MD,
      paddingHorizontal: SIZES.LG,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      borderWidth: 1.5,
      borderColor: colors.BORDER,
    },
    clearText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.TEXT_SECONDARY,
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SIZES.XS,
      paddingVertical: SIZES.MD,
      borderRadius: SIZES.BORDER_RADIUS_MD,
      backgroundColor: colors.NURSE_PRIMARY,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveText: {
      fontSize: SIZES.FONT_SM,
      fontWeight: '600',
      color: colors.WHITE,
    },
  });
}
