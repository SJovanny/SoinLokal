import { supabase, type FamilyLink } from './supabase';

// ---------------------------------------------------------------------------
// Shared logic to resolve which `patient_file_id`s a user can message in,
// based on their role (nurse / patient / family, including managed/proxy
// patients). Extracted from MessagingScreen so it can be reused by the
// global unread-count computation (MessageCountContext) without duplicating
// this branching a 4th time across the app.
// ---------------------------------------------------------------------------

export interface AccessibleFileInfo {
  participantName: string;
  participantSubtitle: string;
  patientId: string;
  participantId: string;
  isManaged: boolean;
  hasGuardian: boolean;
  participantPhotoUrl: string | null;
  participantAvatarType: 'photo' | 'generated' | null;
  participantAvatarSeed: string | null;
}

export interface AccessibleFiles {
  fileIds: string[];
  fileInfoMap: Record<string, AccessibleFileInfo>;
}

interface MinimalUser {
  id: string;
}

interface MinimalUserProfile {
  user_type: 'patient' | 'family' | 'nurse';
}

export async function resolveAccessibleFileIds(
  user: MinimalUser,
  userProfile: MinimalUserProfile,
  familyLinks: FamilyLink[],
): Promise<AccessibleFiles> {
  const role = userProfile.user_type;
  const fileIds: string[] = [];
  const fileInfoMap: Record<string, AccessibleFileInfo> = {};

  if (role === 'nurse') {
    const { data: files } = await supabase
      .from('patient_files')
      .select('id, patient_id')
      .eq('nurse_id', user.id)
      .eq('is_active', true);

    if (files && files.length > 0) {
      const patientIds = [...new Set(files.map((f: any) => f.patient_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
        .in('id', patientIds);

      const profileMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = {
          name: `${p.first_name} ${p.last_name}`,
          photoUrl: p.photo_url ?? null,
          avatarType: p.avatar_type ?? null,
          avatarSeed: p.avatar_seed ?? null,
        };
      });

      const hasGuardianSet = new Set<string>();
      const { data: guardianData } = await supabase
        .from('patient_profiles')
        .select('profile_id')
        .in('profile_id', patientIds)
        .not('managed_by', 'is', null);
      if (guardianData) {
        guardianData.forEach((g: any) => hasGuardianSet.add(g.profile_id));
      }

      files.forEach((f: any) => {
        const isProxied = hasGuardianSet.has(f.patient_id);
        const profile = profileMap[f.patient_id];
        fileIds.push(f.id);
        fileInfoMap[f.id] = {
          participantName: profile?.name ?? 'Patient',
          participantSubtitle: isProxied ? 'Patient (suivi par un proche)' : 'Patient',
          patientId: f.patient_id,
          participantId: f.patient_id,
          isManaged: false,
          hasGuardian: isProxied,
          participantPhotoUrl: profile?.photoUrl ?? null,
          participantAvatarType: profile?.avatarType ?? null,
          participantAvatarSeed: profile?.avatarSeed ?? null,
        };
      });
    }
  } else if (role === 'patient') {
    const { data: files } = await supabase
      .from('patient_files')
      .select('id, nurse_id')
      .eq('patient_id', user.id)
      .eq('is_active', true);

    if (files && files.length > 0) {
      const nurseIds = [...new Set(files.map((f: any) => f.nurse_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
        .in('id', nurseIds);

      const profileMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = {
          name: `${p.first_name} ${p.last_name}`,
          photoUrl: p.photo_url ?? null,
          avatarType: p.avatar_type ?? null,
          avatarSeed: p.avatar_seed ?? null,
        };
      });

      files.forEach((f: any) => {
        const profile = profileMap[f.nurse_id];
        fileIds.push(f.id);
        fileInfoMap[f.id] = {
          participantName: profile?.name ?? 'Infirmière',
          participantSubtitle: 'Infirmière',
          patientId: user.id,
          participantId: f.nurse_id,
          isManaged: false,
          hasGuardian: false,
          participantPhotoUrl: profile?.photoUrl ?? null,
          participantAvatarType: profile?.avatarType ?? null,
          participantAvatarSeed: profile?.avatarSeed ?? null,
        };
      });
    }
  } else if (role === 'family') {
    if (familyLinks.length > 0) {
      const linkedFileIds = familyLinks.map((l) => l.patient_file_id);
      const { data: files } = await supabase
        .from('patient_files')
        .select('id, patient_id, nurse_id')
        .in('id', linkedFileIds);

      if (files && files.length > 0) {
        const patientIds = [...new Set(files.map((f: any) => f.patient_id))];
        const nurseIds = [...new Set(files.map((f: any) => f.nurse_id).filter(Boolean))];

        const { data: patientProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
          .in('id', patientIds);
        const patientMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
        (patientProfiles ?? []).forEach((p: any) => {
          patientMap[p.id] = {
            name: `${p.first_name} ${p.last_name}`,
            photoUrl: p.photo_url ?? null,
            avatarType: p.avatar_type ?? null,
            avatarSeed: p.avatar_seed ?? null,
          };
        });

        let nurseMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
        if (nurseIds.length > 0) {
          const { data: nurseProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
            .in('id', nurseIds);
          (nurseProfiles ?? []).forEach((p: any) => {
            nurseMap[p.id] = {
              name: `${p.first_name} ${p.last_name}`,
              photoUrl: p.photo_url ?? null,
              avatarType: p.avatar_type ?? null,
              avatarSeed: p.avatar_seed ?? null,
            };
          });
        }

        files.forEach((f: any) => {
          const nurseProfile = nurseMap[f.nurse_id];
          const patientProfile = patientMap[f.patient_id];
          fileIds.push(f.id);
          fileInfoMap[f.id] = {
            participantName: nurseProfile?.name ?? 'Infirmière',
            participantSubtitle: patientProfile?.name
              ? `Patient : ${patientProfile.name}`
              : 'Patient',
            patientId: f.patient_id,
            participantId: f.nurse_id,
            isManaged: false,
            hasGuardian: false,
            participantPhotoUrl: nurseProfile?.photoUrl ?? null,
            participantAvatarType: nurseProfile?.avatarType ?? null,
            participantAvatarSeed: nurseProfile?.avatarSeed ?? null,
          };
        });
      }
    }

    const { data: managedProfiles } = await supabase
      .from('patient_profiles')
      .select('profile_id')
      .eq('managed_by', user.id)
      .eq('is_managed', true);

    if (managedProfiles && managedProfiles.length > 0) {
      const existingIds = new Set(fileIds);
      const managedIds = managedProfiles
        .map((p: any) => p.profile_id)
        .filter((id: string) => !existingIds.has(id));

      if (managedIds.length > 0) {
        const { data: managedFiles } = await supabase
          .from('patient_files')
          .select('id, patient_id, nurse_id')
          .in('patient_id', managedIds);

        if (managedFiles && managedFiles.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
            .in('id', managedFiles.map((f: any) => f.patient_id));

          const profileMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.id] = {
              name: `${p.first_name} ${p.last_name}`,
              photoUrl: p.photo_url ?? null,
              avatarType: p.avatar_type ?? null,
              avatarSeed: p.avatar_seed ?? null,
            };
          });

          const nurseIds = [...new Set(managedFiles.map((f: any) => f.nurse_id).filter(Boolean))];
          let nurseMap: Record<string, { name: string; photoUrl: string | null; avatarType: 'photo' | 'generated' | null; avatarSeed: string | null }> = {};
          if (nurseIds.length > 0) {
            const { data: nurseProfiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, photo_url, avatar_type, avatar_seed')
              .in('id', nurseIds);
            (nurseProfiles ?? []).forEach((p: any) => {
              nurseMap[p.id] = {
                name: `${p.first_name} ${p.last_name}`,
                photoUrl: p.photo_url ?? null,
                avatarType: p.avatar_type ?? null,
                avatarSeed: p.avatar_seed ?? null,
              };
            });
          }

          managedFiles.forEach((f: any) => {
            const nurseProfile = nurseMap[f.nurse_id];
            const patientProfile = profileMap[f.patient_id];
            fileIds.push(f.id);
            fileInfoMap[f.id] = {
              participantName: nurseProfile?.name ?? 'Infirmière',
              participantSubtitle: patientProfile?.name
                ? `Patient : ${patientProfile.name}`
                : 'Patient',
              patientId: f.patient_id,
              participantId: f.nurse_id,
              isManaged: true,
              hasGuardian: true,
              participantPhotoUrl: nurseProfile?.photoUrl ?? null,
              participantAvatarType: nurseProfile?.avatarType ?? null,
              participantAvatarSeed: nurseProfile?.avatarSeed ?? null,
            };
          });
        }
      }
    }
  }

  return { fileIds, fileInfoMap };
}

// ---------------------------------------------------------------------------
// Count unread messages across a set of accessible files, excluding the
// user's own messages (including messages sent as a proxy for a managed
// patient). This is the single formula used everywhere "unread messages"
// is displayed (tab bar badge, dashboards) so the numbers never diverge.
// ---------------------------------------------------------------------------

export async function countUnreadMessages(
  userId: string,
  fileIds: string[],
  fileInfoMap: Record<string, AccessibleFileInfo>,
): Promise<number> {
  if (fileIds.length === 0) return 0;

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('patient_file_id, author_id')
    .in('patient_file_id', fileIds)
    .eq('is_read', false);

  if (!unreadMessages) return 0;

  return unreadMessages.reduce((count: number, m: any) => {
    const info = fileInfoMap[m.patient_file_id];
    const proxyPatientId = info?.isManaged ? info.patientId : null;
    const isMyMessage = m.author_id === userId || m.author_id === proxyPatientId;
    return isMyMessage ? count : count + 1;
  }, 0);
}
