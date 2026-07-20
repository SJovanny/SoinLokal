import { supabase, type Profile, type PatientProfile, type PatientFile, type Appointment, type Message } from './supabase';

export interface PatientExportData {
  exportedAt: string;
  profile: Profile | null;
  patientProfile: PatientProfile | null;
  patientFiles: PatientFile[];
  appointments: Appointment[];
  messages: MessageExport[];
}

export interface MessageExport {
  authorName: string;
  content: string;
  createdAt: string;
}

export async function buildPatientExportData(userId: string): Promise<PatientExportData> {
  const exportedAt = new Date().toISOString();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>();

  const { data: patientProfile } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('profile_id', userId)
    .single<PatientProfile>();

  if (!patientProfile) {
    return {
      exportedAt,
      profile: profile ?? null,
      patientProfile: null,
      patientFiles: [],
      appointments: [],
      messages: [],
    };
  }

  const { data: patientFiles } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', patientProfile.id);

  const fileIds = (patientFiles ?? []).map((f) => f.id);

  const { data: appointments } = fileIds.length > 0
    ? await supabase
        .from('appointments')
        .select('*, nurse:nurse_id(id, first_name, last_name)')
        .in('patient_file_id', fileIds)
        .order('date', { ascending: false })
    : { data: [] };

  const { data: rawMessages } = fileIds.length > 0
    ? await supabase
        .from('messages')
        .select('author_id, content, created_at')
        .in('patient_file_id', fileIds)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] };

  const authorIds = [...new Set((rawMessages ?? []).map((m) => m.author_id))];

  const authorMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', authorIds);
    for (const a of authors ?? []) {
      authorMap[a.id] = `${a.first_name} ${a.last_name}`;
    }
  }

  const messages: MessageExport[] = (rawMessages ?? []).map((m) => ({
    authorName: authorMap[m.author_id] ?? 'Inconnu',
    content: m.content,
    createdAt: m.created_at,
  }));

  return {
    exportedAt,
    profile: profile ?? null,
    patientProfile,
    patientFiles: (patientFiles ?? []) as PatientFile[],
    appointments: (appointments ?? []) as Appointment[],
    messages,
  };
}
