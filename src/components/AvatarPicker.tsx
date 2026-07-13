import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { generateRandomSeed, generateAvatarBatch } from '../utils/avatar';
import Avatar from './Avatar';
import { COLORS, SIZES } from '../utils/constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AvatarPickerProps {
  /** Current profile avatar fields */
  photoUrl?: string;
  avatarType: 'photo' | 'generated' | null;
  avatarSeed?: string;
  firstName?: string;
  lastName?: string;
  /** User ID (used as Supabase Storage folder when targetProfileId is not set) */
  userId: string;
  /** Profile ID to update (e.g. patient ID when family uploads for patient) */
  targetProfileId?: string;
  /** Called after avatar is successfully saved, with new avatar fields */
  onSaved: (data: {
    photo_url: string | null;
    avatar_type: 'photo' | 'generated' | null;
    avatar_seed: string | null;
  }) => void;
  /** If true, only photo upload is allowed (no avatar generation option) */
  photoOnly?: boolean;
  /** If true, show as a small inline button instead of a full section */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  photoUrl,
  avatarType,
  avatarSeed,
  firstName = '',
  lastName = '',
  userId,
  targetProfileId,
  onSaved,
  photoOnly = false,
  compact = false,
}) => {
  const profileId = targetProfileId ?? userId;
  const [uploading, setUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarChoices, setAvatarChoices] = useState<string[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  // Initialize avatar batch when modal opens
  const openModal = () => {
    if (avatarChoices.length === 0) {
      const batch = generateAvatarBatch(12);
      setAvatarChoices(batch);
      // Pre-select current seed if it's in the batch
      if (avatarSeed && batch.includes(avatarSeed)) {
        setSelectedSeed(avatarSeed);
      }
    }
    setShowAvatarModal(true);
  };

  const refreshChoices = () => {
    const batch = generateAvatarBatch(12);
    setAvatarChoices(batch);
    setSelectedSeed(null);
  };

  // -------------------------------------------------------------------------
  // Pick image from library
  // -------------------------------------------------------------------------

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Autorisez l\'accès à vos photos pour importer une photo de profil.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadImage(result.assets[0].uri);
  };

  // -------------------------------------------------------------------------
  // Take photo with camera
  // -------------------------------------------------------------------------

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Autorisez l\'accès à l\'appareil photo pour prendre une photo de profil.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadImage(result.assets[0].uri);
  };

  // -------------------------------------------------------------------------
  // Upload to Supabase Storage
  // -------------------------------------------------------------------------

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      // Compress & resize
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const file = new File(manipulated.uri);
      const arrayBuffer = await file.arrayBuffer();

      const filePath = `${profileId}/avatar_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { data: updated, error: dbError } = await supabase
        .from('profiles')
        .update({
          photo_url: publicUrl,
          avatar_type: 'photo',
          avatar_seed: null,
        })
        .eq('id', profileId)
        .select('id');

      if (dbError) throw dbError;
      if (!updated || updated.length === 0) {
        throw new Error('Mise à jour refusée — permissions insuffisantes.');
      }

      onSaved({
        photo_url: publicUrl,
        avatar_type: 'photo',
        avatar_seed: null,
      });

      Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
    } catch (err: any) {
      console.error('[AvatarPicker] upload error:', err);
      Alert.alert('Erreur', err?.message ?? 'Impossible de télécharger la photo.');
    } finally {
      setUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Choose generated avatar
  // -------------------------------------------------------------------------

  const handleSaveGeneratedAvatar = async () => {
    if (!selectedSeed) return;
    setUploading(true);
    try {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          photo_url: null,
          avatar_type: 'generated',
          avatar_seed: selectedSeed,
        })
        .eq('id', profileId)
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error('Mise à jour refusée — permissions insuffisantes.');
      }

      onSaved({
        photo_url: null,
        avatar_type: 'generated',
        avatar_seed: selectedSeed,
      });

      setShowAvatarModal(false);
      Alert.alert('Succès', 'Votre avatar a été mis à jour.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de sauvegarder l\'avatar.');
    } finally {
      setUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Remove photo → fall back to generated avatar with initials
  // -------------------------------------------------------------------------

  const handleRemovePhoto = async () => {
    Alert.alert(
      'Supprimer la photo',
      'Voulez-vous supprimer cette photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const newSeed = generateRandomSeed();
              const { data: updated, error } = await supabase
                .from('profiles')
                .update({
                  photo_url: null,
                  avatar_type: 'generated',
                  avatar_seed: newSeed,
                })
                .eq('id', profileId)
                .select('id');

              if (error) throw error;
              if (!updated || updated.length === 0) {
                throw new Error('Mise à jour refusée — permissions insuffisantes.');
              }

              onSaved({
                photo_url: null,
                avatar_type: 'generated',
                avatar_seed: newSeed,
              });
            } catch (err: any) {
              Alert.alert('Erreur', err?.message ?? 'Suppression échouée.');
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const currentSize = compact ? 48 : 80;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={openModal}
        disabled={uploading}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <Avatar
            photoUrl={photoUrl}
            avatarType={avatarType}
            avatarSeed={avatarSeed}
            firstName={firstName}
            lastName={lastName}
            size={currentSize}
          />
          {uploading ? (
            <View style={[styles.badge, styles.badgeLoading]}>
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            </View>
          ) : (
            <View style={styles.badge}>
              <Ionicons name="camera" size={14} color={COLORS.WHITE} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Avatar picker modal */}
      <Modal visible={showAvatarModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo de profil</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Current preview */}
              <View style={styles.previewRow}>
                <Avatar
                  photoUrl={photoUrl}
                  avatarType={avatarType}
                  avatarSeed={avatarSeed}
                  firstName={firstName}
                  lastName={lastName}
                  size={100}
                />
              </View>

              {/* Photo actions */}
              <Text style={styles.sectionLabel}>Photo réelle</Text>
              <TouchableOpacity style={styles.optionBtn} onPress={handlePickImage}>
                <Ionicons name="images-outline" size={22} color={COLORS.NURSE_PRIMARY} />
                <Text style={styles.optionText}>Choisir dans la galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={22} color={COLORS.NURSE_PRIMARY} />
                <Text style={styles.optionText}>Prendre une photo</Text>
              </TouchableOpacity>

              {/* Generated avatar option */}
              {!photoOnly && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: SIZES.LG }]}>
                    Avatar illustré
                  </Text>
                  <Text style={styles.helperText}>
                    Choisissez l'avatar qui vous ressemble le plus.
                  </Text>

                  <View style={styles.avatarGrid}>
                    {avatarChoices.map((seed) => {
                      const isSelected = selectedSeed === seed;
                      return (
                        <TouchableOpacity
                          key={seed}
                          style={[
                            styles.avatarGridItem,
                            isSelected && styles.avatarGridItemSelected,
                          ]}
                          onPress={() => setSelectedSeed(seed)}
                          activeOpacity={0.7}
                        >
                          <Avatar
                            avatarType="generated"
                            avatarSeed={seed}
                            firstName={firstName}
                            lastName={lastName}
                            size={70}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={refreshChoices}
                  >
                    <Ionicons name="refresh" size={18} color={COLORS.NURSE_PRIMARY} />
                    <Text style={styles.refreshBtnText}>Rafraîchir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      (!selectedSeed || uploading) && { opacity: 0.4 },
                    ]}
                    onPress={handleSaveGeneratedAvatar}
                    disabled={!selectedSeed || uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={COLORS.WHITE} />
                    ) : (
                      <Text style={styles.saveBtnText}>Valider cet avatar</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Remove current photo */}
              {photoUrl && avatarType === 'photo' && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={handleRemovePhoto}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.DANGER} />
                  <Text style={styles.removeBtnText}>Supprimer la photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.NURSE_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  badgeLoading: {
    backgroundColor: COLORS.TEXT_MUTED,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LG,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LG,
    minHeight: '60%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: SIZES.FONT_LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: SIZES.LG,
    paddingBottom: 40,
  },
  previewRow: {
    alignItems: 'center',
    marginBottom: SIZES.LG,
  },
  sectionLabel: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SIZES.SM,
  },
  helperText: {
    fontSize: SIZES.FONT_XS,
    color: COLORS.TEXT_MUTED,
    marginBottom: SIZES.MD,
    lineHeight: 18,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.MD,
    paddingVertical: SIZES.MD,
    paddingHorizontal: SIZES.MD,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginBottom: SIZES.SM,
  },
  optionText: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SIZES.SM,
    marginVertical: SIZES.MD,
  },
  avatarGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarGridItemSelected: {
    borderColor: COLORS.NURSE_PRIMARY,
    backgroundColor: COLORS.NURSE_LIGHT,
    shadowColor: COLORS.NURSE_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.XS,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_SM,
    borderWidth: 1,
    borderColor: COLORS.NURSE_PRIMARY,
    marginTop: SIZES.SM,
  },
  refreshBtnText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.NURSE_PRIMARY,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.NURSE_PRIMARY,
    height: SIZES.BUTTON_HEIGHT,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.MD,
  },
  saveBtnText: {
    color: COLORS.WHITE,
    fontSize: SIZES.FONT_MD,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.SM,
    marginTop: SIZES.LG,
    paddingVertical: SIZES.MD,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
  },
  removeBtnText: {
    fontSize: SIZES.FONT_SM,
    color: COLORS.DANGER,
    fontWeight: '600',
  },
});

export default AvatarPicker;
