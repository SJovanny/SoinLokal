import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { COLORS } from '../../utils/constants';
import { debugLog } from '../../utils/devConfig';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentState {
  uri: string | null;
  fileName: string | null;
  mimeType: string | null;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  storageKey: string;
  column: 'cni_path' | 'justificatif_domicile_path' | 'carte_pro_path';
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const NursePendingVerificationScreen = () => {
  const { user, nurseProfile, logout, fetchProfile } = useAuth();

  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    cni: { uri: null, fileName: null, mimeType: null, label: "Carte d'identité", icon: 'card-outline', storageKey: 'cni', column: 'cni_path' },
    domicile: { uri: null, fileName: null, mimeType: null, label: 'Justificatif de domicile', icon: 'home-outline', storageKey: 'domicile', column: 'justificatif_domicile_path' },
    carte_pro: { uri: null, fileName: null, mimeType: null, label: 'Carte professionnelle (CPS)', icon: 'medal-outline', storageKey: 'carte_pro', column: 'carte_pro_path' },
  });

  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showEditRpps, setShowEditRpps] = useState(false);
  const [newRppsNumber, setNewRppsNumber] = useState('');
  const [verifying, setVerifying] = useState(false);

  console.log('[Onboarding][NursePendingVerificationScreen] render', {
    userId: user?.id,
    verificationStatus: nurseProfile?.verification_status,
  });

  const status = nurseProfile?.verification_status;
  const isPendingDocs = status === 'pending_docs';
  const isPendingReview = status === 'pending_review';
  const isRejected = status === 'rejected';
  const canUpload = isPendingDocs || isRejected;

  // -------------------------------------------------------------------------
  // Pick document — image or PDF
  // -------------------------------------------------------------------------

  const handlePickImage = async (docKey: string) => {
    console.log('[NursePendingVerificationScreen] handlePickImage called for', docKey);
    try {
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[NursePendingVerificationScreen] media library permission status:', permStatus);
      if (permStatus !== 'granted') {
        Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour importer vos documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      console.log('[NursePendingVerificationScreen] launchImageLibraryAsync result:', JSON.stringify({ canceled: result.canceled, assetsCount: result.assets?.length }));

      if (result.canceled || !result.assets?.[0]) return;

      console.log('[NursePendingVerificationScreen] manipulating image, uri:', result.assets[0].uri);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      console.log('[NursePendingVerificationScreen] manipulated image uri:', manipulated.uri);

      setDocuments(prev => ({
        ...prev,
        [docKey]: { ...prev[docKey]!, uri: manipulated.uri, fileName: null, mimeType: 'image/jpeg' },
      }));
      console.log('[NursePendingVerificationScreen] document state updated for', docKey);
    } catch (err: any) {
      console.error('[NursePendingVerificationScreen] Image picker error:', err);
      Alert.alert('Erreur', err?.message ?? "Impossible d'ouvrir le sélecteur d'images.");
    }
  };

  const handlePickPdf = async (docKey: string) => {
    console.log('[NursePendingVerificationScreen] handlePickPdf called for', docKey);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      console.log('[NursePendingVerificationScreen] getDocumentAsync result:', JSON.stringify({ canceled: result.canceled, assetsCount: result.assets?.length }));

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      console.log('[NursePendingVerificationScreen] PDF asset:', JSON.stringify({ name: asset.name, size: asset.size, uri: asset.uri }));

      if (asset.size && asset.size > MAX_FILE_SIZE) {
        Alert.alert('Fichier trop volumineux', 'Le fichier ne doit pas dépasser 5 Mo.');
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [docKey]: { ...prev[docKey]!, uri: asset.uri, fileName: asset.name, mimeType: 'application/pdf' },
      }));
      console.log('[NursePendingVerificationScreen] document state updated for', docKey);
    } catch (err: any) {
      console.error('[NursePendingVerificationScreen] PDF picker error:', err);
      Alert.alert('Erreur', err?.message ?? 'Impossible d\'ouvrir le sélecteur de PDF.');
    }
  };

  const handlePickDocument = (docKey: string) => {
    console.log('[NursePendingVerificationScreen] handlePickDocument called for', docKey);
    Alert.alert(
      'Choisir un document',
      'Sélectionnez le type de fichier à importer.',
      [
        {
          text: 'Image (galerie)',
          onPress: () => {
            console.log('[NursePendingVerificationScreen] Image option pressed, target:', docKey);
            handlePickImage(docKey);
          },
        },
        {
          text: 'Document PDF',
          onPress: () => {
            console.log('[NursePendingVerificationScreen] PDF option pressed, target:', docKey);
            handlePickPdf(docKey);
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  // -------------------------------------------------------------------------
  // Submit all documents
  // -------------------------------------------------------------------------

  const allDocumentsSelected = Object.values(documents).every(d => d.uri !== null);

  const handleSubmitDocuments = async () => {
    if (!user || !allDocumentsSelected) return;

    console.log('[NursePendingVerificationScreen] handleSubmitDocuments started');
    setUploading(true);
    try {
      const updates: Record<string, string> = {};

      for (const [key, doc] of Object.entries(documents)) {
        if (!doc.uri) continue;

        console.log('[NursePendingVerificationScreen] uploading', key, 'mimeType:', doc.mimeType, 'uri:', doc.uri);

        const isPdf = doc.mimeType === 'application/pdf';
        const ext = isPdf ? 'pdf' : 'jpg';
        const contentType = isPdf ? 'application/pdf' : 'image/jpeg';
        const file = new File(doc.uri);
        const arrayBuffer = await file.arrayBuffer();
        console.log('[NursePendingVerificationScreen] arrayBuffer byteLength for', key, ':', arrayBuffer.byteLength);
        const filePath = `${user.id}/${doc.storageKey}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('nurse-documents')
          .upload(filePath, arrayBuffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) throw uploadError;
        console.log('[NursePendingVerificationScreen] uploaded', key, 'to', filePath);

        updates[doc.column] = filePath;
      }

      console.log('[NursePendingVerificationScreen] updating nurse_profiles with', JSON.stringify(updates));
      const { error: updateError } = await supabase
        .from('nurse_profiles')
        .update({
          ...updates,
          verification_status: 'pending_review',
        })
        .eq('profile_id', user.id);

      if (updateError) throw updateError;

      setSubmitted(true);
      await fetchProfile(user.id);
      console.log('[NursePendingVerificationScreen] handleSubmitDocuments completed successfully');
      Alert.alert(
        'Documents envoyés',
        'Vos documents ont été transmis avec succès. Un administrateur va les examiner sous peu.',
      );
    } catch (err: any) {
      console.error('[NursePendingVerificationScreen] upload error:', err);
      Alert.alert('Erreur', err?.message ?? "Impossible d'envoyer vos documents.");
    } finally {
      setUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Refresh profile
  // -------------------------------------------------------------------------

  const handleRefresh = async () => {
    if (user) await fetchProfile(user.id);
  };

  // -------------------------------------------------------------------------
  // Update RPPS
  // -------------------------------------------------------------------------

  const handleUpdateRpps = async () => {
    const trimmed = newRppsNumber.replace(/\s/g, '');

    if (!/^\d{11}$/.test(trimmed)) {
      Alert.alert('Erreur', 'Le numéro RPPS doit contenir 11 chiffres');
      return;
    }

    if (!user || !nurseProfile) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-rpps', {
        body: { rppsNumber: trimmed },
      });

      if (error) {
        debugLog('RPPS update - Supabase function error', error);
        Alert.alert('Vérification impossible', 'Le service de vérification RPPS est indisponible. Veuillez réessayer ultérieurement.');
        return;
      }

      if (data?.status === 'verified') {
        const { error: updateError } = await supabase
          .from('nurse_profiles')
          .update({
            rpps_number: trimmed,
            verification_status: 'pending_docs',
            verified_at: null,
          })
          .eq('profile_id', user.id);

        if (updateError) throw updateError;

        setShowEditRpps(false);
        await fetchProfile(user.id);
        Alert.alert('Succès', 'Votre numéro RPPS a été vérifié. Veuillez maintenant soumettre vos documents.');
      } else if (data?.status === 'not_found' || data?.status === 'not_a_nurse' || data?.status === 'inactive') {
        debugLog('RPPS update - verification failed', { status: data.status, message: data.message, rppsNumber: trimmed });
        Alert.alert('Vérification impossible', data.message ?? "Nous n'avons pas pu confirmer ce numéro RPPS. Vérifiez votre saisie.");
      } else {
        debugLog('RPPS update - function returned error status', { status: data?.status, message: data?.message });
        Alert.alert('Vérification impossible', data?.message ?? "Le service de vérification RPPS est indisponible. Veuillez réessayer ultérieurement.");
      }
    } catch (err) {
      debugLog('RPPS update - exception', err);
      Alert.alert('Erreur', 'Impossible de vérifier le numéro RPPS. Vérifiez votre connexion internet.');
    } finally {
      setVerifying(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header icon */}
        <View style={styles.iconWrapper}>
          <Ionicons
            name={isPendingReview ? 'time-outline' : 'document-text-outline'}
            size={48}
            color={COLORS.NURSE_PRIMARY ?? '#2E8B57'}
          />
        </View>

        {/* Title + subtitle */}
        <Text style={styles.title}>
          {isPendingReview ? 'Vérification en cours' : 'Vérification de votre compte'}
        </Text>
        <Text style={styles.subtitle}>
          {isPendingReview
            ? 'Vos documents ont été soumis et sont en cours de vérification par un administrateur. Vous serez notifiée dès que votre compte sera activé.'
            : isRejected
            ? 'Votre demande a été rejetée. Veuillez soumettre de nouveaux documents pour que votre compte soit activé.'
            : 'Pour accéder à SoinLokal, veuillez soumettre les documents suivants (image ou PDF, 5 Mo max) :'}
        </Text>

        {/* Rejection note */}
        {isRejected && nurseProfile?.rejection_note && (
          <View style={styles.rejectionNoteBox}>
            <Ionicons name="alert-circle" size={20} color="#E74C3C" />
            <View style={styles.rejectionNoteContent}>
              <Text style={styles.rejectionNoteLabel}>Motif du rejet</Text>
              <Text style={styles.rejectionNoteText}>{nurseProfile.rejection_note}</Text>
            </View>
          </View>
        )}

        {/* RPPS info */}
        {nurseProfile?.rpps_number && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Numéro RPPS</Text>
            <Text style={styles.infoValue}>{nurseProfile.rpps_number}</Text>
          </View>
        )}

        {/* Edit RPPS button */}
        <TouchableOpacity
          style={styles.editRppsButton}
          onPress={() => {
            setNewRppsNumber(nurseProfile?.rpps_number ?? '');
            setShowEditRpps(true);
          }}
        >
          <Ionicons name="pencil-outline" size={16} color={COLORS.NURSE_PRIMARY ?? '#2E8B57'} />
          <Text style={styles.editRppsButtonText}>Modifier mon numéro RPPS</Text>
        </TouchableOpacity>

        {/* Document upload form */}
        {canUpload && !submitted && (
          <View style={styles.docsSection}>
            {Object.entries(documents).map(([key, doc]) => (
              <TouchableOpacity
                key={key}
                style={styles.docCard}
                onPress={() => handlePickDocument(key)}
                activeOpacity={0.7}
              >
                <View style={styles.docCardLeft}>
                  <Ionicons name={doc.icon} size={24} color={doc.uri ? '#2E8B57' : '#94A3B8'} />
                  <View style={styles.docCardText}>
                    <Text style={styles.docCardLabel}>{doc.label}</Text>
                    <Text style={styles.docCardStatus}>
                      {doc.uri
                        ? doc.fileName ?? 'Document sélectionné'
                        : 'Appuyez pour sélectionner'}
                    </Text>
                  </View>
                </View>
                {doc.uri ? (
                  doc.mimeType === 'application/pdf' ? (
                    <Ionicons name="document-text" size={24} color="#2E8B57" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={24} color="#2E8B57" />
                  )
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                )}
              </TouchableOpacity>
            ))}

            {/* Preview selected documents */}
            {Object.entries(documents).some(([, d]) => d.uri) && (
              <View style={styles.previewRow}>
                {Object.entries(documents).map(([key, doc]) =>
                  doc.uri ? (
                    doc.mimeType === 'application/pdf' ? (
                      <View key={key} style={styles.previewPdf}>
                        <Ionicons name="document-text" size={32} color="#E74C3C" />
                        <Text style={styles.previewPdfText} numberOfLines={1}>
                          {doc.fileName ?? 'PDF'}
                        </Text>
                      </View>
                    ) : (
                      <Image key={key} source={{ uri: doc.uri }} style={styles.previewImage} />
                    )
                  ) : null,
                )}
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.primaryButton, !allDocumentsSelected && styles.primaryButtonDisabled]}
              onPress={handleSubmitDocuments}
              disabled={!allDocumentsSelected || uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>Soumettre mes documents</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Submitted confirmation */}
        {(isPendingReview || submitted) && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#2E8B57" />
            <Text style={styles.successText}>
              Documents soumis, en attente de validation par un administrateur.
            </Text>
          </View>
        )}

        {/* Refresh + Logout */}
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRefresh}>
          <Text style={styles.secondaryButtonText}>Actualiser le statut</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Edit RPPS Modal */}
      <Modal visible={showEditRpps} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Modifier le numéro RPPS</Text>
            <Text style={styles.modalSubtitle}>
              Saisissez votre nouveau numéro RPPS (11 chiffres). Il sera vérifié automatiquement.
            </Text>

            <View style={styles.modalInputContainer}>
              <Ionicons name="card-outline" size={20} color="#94A3B8" style={styles.modalInputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Numéro RPPS (11 chiffres)"
                placeholderTextColor="#94A3B8"
                value={newRppsNumber}
                onChangeText={v => setNewRppsNumber(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={11}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, { backgroundColor: COLORS.NURSE_PRIMARY ?? '#2E8B57' }]}
              onPress={handleUpdateRpps}
              disabled={verifying}
              activeOpacity={0.85}
            >
              {verifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>Vérifier et enregistrer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEditRpps(false)}
              disabled={verifying}
            >
              <Text style={styles.modalCancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 12,
  },
  infoLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  rejectionNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  rejectionNoteContent: { flex: 1 },
  rejectionNoteLabel: { fontSize: 12, fontWeight: '600', color: '#E74C3C', marginBottom: 4 },
  rejectionNoteText: { fontSize: 14, color: '#991B1B', lineHeight: 20 },
  editRppsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 20,
  },
  editRppsButtonText: {
    color: COLORS.NURSE_PRIMARY ?? '#2E8B57',
    fontSize: 14,
    fontWeight: '600',
  },
  docsSection: {
    width: '100%',
    marginBottom: 16,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 10,
  },
  docCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docCardText: { flex: 1 },
  docCardLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  docCardStatus: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  previewPdf: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  previewPdfText: {
    fontSize: 9,
    color: '#E74C3C',
    marginTop: 4,
    maxWidth: 70,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY ?? '#2E8B57',
    width: '100%',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  successBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#E8F5EC',
    padding: 14,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  successText: { color: '#1A1A2E', fontSize: 14, flex: 1 },
  secondaryButton: { paddingVertical: 12 },
  secondaryButtonText: { color: COLORS.NURSE_PRIMARY ?? '#2E8B57', fontSize: 15, fontWeight: '600' },
  logoutButton: { paddingVertical: 12, marginTop: 8 },
  logoutButtonText: { color: '#94A3B8', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  modalInputIcon: { marginRight: 12 },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
  },
  modalPrimaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NursePendingVerificationScreen;
