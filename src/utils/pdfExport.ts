import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { Appointment, Profile, PatientProfile } from './supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtTime(time: string | null): string {
  if (!time) return '—';
  return time.substring(0, 5).replace(':', 'h');
}

function esc(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

// ---------------------------------------------------------------------------
// HTML Template
// ---------------------------------------------------------------------------

function buildHTML(
  appointments: Appointment[],
  title: string,
  subtitle: string,
  accentColor: string,
): string {
  const now = new Date();
  const exportDate = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const rows = appointments
    .map((a) => {
      const nurseName = (a as any).nurse
        ? `${(a as any).nurse.first_name} ${(a as any).nurse.last_name}`
        : null;

      const signatureCell = a.signature_data
        ? `<td class="sig-cell">${a.signature_data.replace(/viewBox="[^"]*"/, 'viewBox="0 0 350 250"').replace(/width="[^"]*"/, 'width="100"').replace(/height="[^"]*"/, 'height="60"')}</td>`
        : '<td class="sig-cell">—</td>';

      return `
      <tr>
        <td>${fmtDate(a.date)}</td>
        <td>${fmtTime(a.time)}</td>
        <td><span class="badge">${esc(a.care_type)}</span></td>
        <td>${nurseName ? esc(nurseName) : '—'}</td>
        <td>${a.duration_min ? a.duration_min + ' min' : '—'}</td>
        <td>${esc(a.care_performed)}</td>
        <td>${esc(a.observations)}</td>
        <td>${esc(a.remarks)}</td>
        ${signatureCell}
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #333;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-left h1 {
      font-size: 20px;
      color: ${accentColor};
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header-left .subtitle {
      font-size: 13px;
      color: #666;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: #999;
    }
    .header-right .app-name {
      font-weight: 700;
      color: ${accentColor};
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: ${accentColor};
      color: #fff;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 8px 6px;
      text-align: left;
      white-space: nowrap;
    }
    th:first-child { border-radius: 4px 0 0 0; }
    th:last-child  { border-radius: 0 4px 0 0; }
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #eee;
      font-size: 10.5px;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #fafafa; }
    tr:hover td { background: #f0f0f0; }
    .badge {
      display: inline-block;
      background: ${accentColor}22;
      color: ${accentColor};
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }
    .sig-cell {
      text-align: center;
      vertical-align: middle;
      min-width: 100px;
    }
    .sig-cell svg {
      max-width: 100px;
      max-height: 50px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
    }
    .count {
      font-size: 11px;
      color: #666;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${esc(title)}</h1>
      <div class="subtitle">${esc(subtitle)}</div>
    </div>
    <div class="header-right">
      <div class="app-name">SoinLokal</div>
      <div>Exporté le ${exportDate}</div>
    </div>
  </div>

  <div class="count">${appointments.length} soins enregistré${appointments.length > 1 ? 's' : ''}</div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Heure</th>
        <th>Type de soin</th>
        <th>Infirmier</th>
        <th>Durée</th>
        <th>Soins réalisés</th>
        <th>Observations</th>
        <th>Remarques</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>SoinLokal — Historique des soins</span>
    <span>${appointments.length} soins</span>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Export function
// ---------------------------------------------------------------------------

export interface ExportOptions {
  appointments: Appointment[];
  title: string;
  subtitle: string;
  accentColor?: string;
}

export async function exportCareHistoryToPDF(options: ExportOptions): Promise<void> {
  const {
    appointments,
    title,
    subtitle,
    accentColor = '#2E8B57',
  } = options;

  if (appointments.length === 0) {
    Alert.alert('Aucun soin', "Il n'y a aucun soin à exporter.");
    return;
  }

  try {
    const html = buildHTML(appointments, title, subtitle, accentColor);
    const { uri } = await printToFileAsync({
      html,
      width: 842,
      height: 595,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: title,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF généré', `Fichier enregistré : ${uri}`);
    }
  } catch (err: any) {
    console.error('[PDFExport] error:', err);
    Alert.alert('Erreur', "Impossible de générer le PDF. Veuillez réessayer.");
  }
}

export interface PatientDossierOptions {
  profile: Profile;
  patientProfile: PatientProfile;
  appointments: Appointment[];
  accentColor?: string;
}

function buildDossierHTML(options: PatientDossierOptions): string {
  const {
    profile,
    patientProfile,
    appointments,
    accentColor = '#4A90E2',
  } = options;

  const now = new Date();
  const exportDate = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const dobFormatted = patientProfile.dob
    ? new Date(patientProfile.dob + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const rows = appointments
    .map((a) => {
      const nurseName = (a as any).nurse
        ? `${(a as any).nurse.first_name} ${(a as any).nurse.last_name}`
        : null;

      const statusLabel: Record<string, string> = {
        pending: 'En attente',
        confirmed: 'Confirmé',
        completed: 'Terminé',
        cancelled: 'Annulé',
      };

      const signatureCell = a.signature_data
        ? `<td class="sig-cell">${a.signature_data.replace(/viewBox="[^"]*"/, 'viewBox="0 0 350 250"').replace(/width="[^"]*"/, 'width="80"').replace(/height="[^"]*"/, 'height="50"')}</td>`
        : '<td class="sig-cell">—</td>';

      return `
      <tr>
        <td>${fmtDate(a.date)}</td>
        <td>${fmtTime(a.time)}</td>
        <td>${esc(a.care_type)}</td>
        <td>${nurseName ? esc(nurseName) : '—'}</td>
        <td><span class="status status-${a.status}">${statusLabel[a.status] ?? a.status}</span></td>
        <td>${esc(a.care_performed)}</td>
        <td>${esc(a.observations)}</td>
        ${signatureCell}
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dossier patient — ${esc(profile.first_name)} ${esc(profile.last_name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5px;
      color: #333;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .header-left h1 {
      font-size: 18px;
      color: ${accentColor};
      font-weight: 700;
      margin-bottom: 2px;
    }
    .header-left .subtitle {
      font-size: 11px;
      color: #666;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #999;
    }
    .header-right .app-name {
      font-weight: 700;
      color: ${accentColor};
      font-size: 11px;
    }
    .patient-card {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 18px;
    }
    .patient-card h2 {
      font-size: 14px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 10px;
    }
    .info-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 20px;
    }
    .info-item {
      flex: 0 0 calc(50% - 10px);
      min-width: 180px;
      padding: 4px 0;
    }
    .info-item .label {
      font-size: 8.5px;
      text-transform: uppercase;
      color: #999;
      letter-spacing: 0.3px;
      font-weight: 600;
    }
    .info-item .value {
      font-size: 10.5px;
      color: #333;
      font-weight: 500;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e0e0e0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: ${accentColor};
      color: #fff;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 6px 5px;
      text-align: left;
      white-space: nowrap;
    }
    th:first-child { border-radius: 3px 0 0 0; }
    th:last-child  { border-radius: 0 3px 0 0; }
    td {
      padding: 5px;
      border-bottom: 1px solid #eee;
      font-size: 9.5px;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .status {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 8px;
      white-space: nowrap;
    }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-confirmed { background: #e3f2fd; color: #1565c0; }
    .status-pending   { background: #fff3e0; color: #e65100; }
    .status-cancelled { background: #ffebee; color: #c62828; }
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #999;
    }
    .count {
      font-size: 10px;
      color: #666;
      margin-bottom: 10px;
    }
    .sig-cell {
      text-align: center;
      vertical-align: middle;
      min-width: 80px;
    }
    .sig-cell svg {
      max-width: 80px;
      max-height: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Dossier patient</h1>
      <div class="subtitle">${esc(profile.first_name)} ${esc(profile.last_name)}</div>
    </div>
    <div class="header-right">
      <div class="app-name">SoinLokal</div>
      <div>Exporté le ${exportDate}</div>
    </div>
  </div>

  <div class="patient-card">
    <h2>Informations patient</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Nom complet</div>
        <div class="value">${esc(profile.first_name)} ${esc(profile.last_name)}</div>
      </div>
      <div class="info-item">
        <div class="label">Email</div>
        <div class="value">${esc(profile.email)}</div>
      </div>
      <div class="info-item">
        <div class="label">Téléphone</div>
        <div class="value">${esc(profile.phone)}</div>
      </div>
      <div class="info-item">
        <div class="label">Date de naissance</div>
        <div class="value">${dobFormatted}</div>
      </div>
      <div class="info-item">
        <div class="label">Adresse</div>
        <div class="value">${esc(patientProfile.address)}</div>
      </div>
      <div class="info-item">
        <div class="label">Contact d'urgence</div>
        <div class="value">${esc(patientProfile.emergency_contact)}</div>
      </div>
    </div>
  </div>

  <div class="section-title">Historique des soins</div>
  <div class="count">${appointments.length} soin${appointments.length > 1 ? 's' : ''} enregistré${appointments.length > 1 ? 's' : ''}</div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Heure</th>
        <th>Type de soin</th>
        <th>Infirmier</th>
        <th>Statut</th>
        <th>Soins réalisés</th>
        <th>Observations</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>SoinLokal — Dossier patient RGPD</span>
    <span>${appointments.length} soins</span>
  </div>
</body>
</html>`;
}

export async function exportPatientDossierToPDF(options: PatientDossierOptions): Promise<void> {
  const {
    profile,
    patientProfile,
    appointments,
    accentColor = '#4A90E2',
  } = options;

  try {
    const html = buildDossierHTML({ profile, patientProfile, appointments, accentColor });
    const { uri } = await printToFileAsync({
      html,
      width: 595,
      height: 842,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Dossier patient — ${profile.first_name} ${profile.last_name}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF généré', `Fichier enregistré : ${uri}`);
    }
  } catch (err: any) {
    console.error('[PDFExport] dossier error:', err);
    Alert.alert('Erreur', "Impossible de générer le dossier PDF. Veuillez réessayer.");
  }
}
