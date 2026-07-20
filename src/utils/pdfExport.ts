import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { Appointment } from './supabase';

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
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
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
