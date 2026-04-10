// src/utils/printPrescription.js
// Generates a professional prescription PDF and shares/prints it
// Uses expo-print + expo-sharing (already in managed workflow)

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

/**
 * Build prescription HTML
 */
function buildPrescriptionHtml({ patient, doctor, medications, notes, diagnosis, facility, prescriptionDate }) {
  const now = prescriptionDate
    ? new Date(prescriptionDate).toLocaleString('en-KE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('en-KE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  const rxNo = `RX-${Date.now().toString().slice(-8)}`;
  const facilityName = facility?.name || 'AfyaScribe Facility';
  const facilityPhone = facility?.phone || '';
  const facilityAddress = facility?.address || '';

  const patientName = patient
    ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
    : 'Patient';
  const patientId = patient?.patientId || '';
  const patientAge = patient?.age ? `${patient.age} yrs` : '';
  const patientGender = patient?.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : '';

  const doctorName = doctor
    ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    : 'Prescribing Doctor';

  const medicationRows = (medications || []).map((med, idx) => `
    <tr>
      <td class="rx-num">${idx + 1}.</td>
      <td class="rx-drug">
        <strong>${med.name || 'Medication'}</strong>
        ${med.dosage ? `<span class="rx-detail"> ${med.dosage}</span>` : ''}
        ${med.frequency ? `<div class="rx-freq">${med.frequency}</div>` : ''}
        ${med.duration ? `<div class="rx-dur">Duration: ${med.duration}</div>` : ''}
        ${med.instructions ? `<div class="rx-inst"><em>${med.instructions}</em></div>` : ''}
      </td>
      <td class="rx-qty">${med.quantity || ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background: #fff;
    font-size: 13px;
  }
  .page {
    max-width: 480px;
    margin: 0 auto;
    padding: 28px 24px 32px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 3px solid #0f766e;
    margin-bottom: 16px;
  }
  .facility-info {}
  .facility-name {
    font-size: 20px;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: -0.5px;
  }
  .facility-sub {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .rx-badge {
    text-align: right;
  }
  .rx-badge-symbol {
    font-size: 48px;
    font-weight: 900;
    color: #0f766e;
    line-height: 1;
    font-style: italic;
  }
  .rx-badge-label {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  /* ── Prescription meta ── */
  .meta-row {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    font-size: 11px;
    color: #64748b;
  }
  .meta-item strong { color: #1e293b; font-size: 12px; }

  /* ── Patient box ── */
  .patient-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 16px;
  }
  .patient-box-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #0f766e;
    margin-bottom: 8px;
  }
  .patient-grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .patient-item { font-size: 12px; }
  .patient-item .lbl { color: #64748b; font-size: 10px; display: block; }
  .patient-item .val { color: #0f172a; font-weight: 600; }

  /* ── Diagnosis ── */
  .diagnosis-box {
    background: #f8fafc;
    border-left: 3px solid #0f766e;
    padding: 10px 14px;
    margin-bottom: 16px;
    border-radius: 0 8px 8px 0;
  }
  .diagnosis-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #0f766e;
    margin-bottom: 4px;
  }
  .diagnosis-text { font-size: 13px; font-weight: 600; color: #1e293b; }

  /* ── Medications ── */
  .meds-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .meds-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
  table.meds-table {
    width: 100%;
    border-collapse: collapse;
  }
  .meds-table thead th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    padding: 5px 6px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }
  .rx-num {
    width: 28px;
    padding: 10px 6px;
    vertical-align: top;
    font-weight: 700;
    color: #0f766e;
    font-size: 13px;
  }
  .rx-drug {
    padding: 10px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  .rx-drug strong { font-size: 14px; color: #0f172a; }
  .rx-detail { font-size: 13px; color: #475569; font-weight: 600; }
  .rx-freq { font-size: 12px; color: #0f766e; margin-top: 2px; font-weight: 600; }
  .rx-dur { font-size: 11px; color: #64748b; margin-top: 1px; }
  .rx-inst { font-size: 11px; color: #64748b; margin-top: 3px; font-style: italic; }
  .rx-qty {
    width: 60px;
    padding: 10px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
    text-align: right;
    font-weight: 700;
    color: #0f172a;
    font-size: 13px;
    white-space: nowrap;
  }

  /* ── Empty meds ── */
  .no-meds {
    text-align: center;
    padding: 24px;
    color: #94a3b8;
    font-style: italic;
    border: 1.5px dashed #e2e8f0;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  /* ── Notes ── */
  .notes-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 10px 14px;
    margin-top: 12px;
    margin-bottom: 20px;
  }
  .notes-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #b45309;
    margin-bottom: 4px;
  }
  .notes-text { font-size: 12px; color: #92400e; line-height: 1.5; }

  /* ── Signature ── */
  .signature-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px dashed #e2e8f0;
  }
  .signature-box {
    text-align: center;
    min-width: 160px;
  }
  .signature-line {
    border-bottom: 1.5px solid #1e293b;
    height: 36px;
    margin-bottom: 4px;
  }
  .signature-name {
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
  }
  .signature-title { font-size: 11px; color: #64748b; }

  /* ── Footer ── */
  .footer {
    text-align: center;
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
  .footer p { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
  .validity {
    display: inline-block;
    background: #fef2f2;
    color: #dc2626;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="facility-info">
      <div class="facility-name">🏥 ${facilityName}</div>
      ${facilityAddress ? `<div class="facility-sub">${facilityAddress}</div>` : ''}
      ${facilityPhone ? `<div class="facility-sub">Tel: ${facilityPhone}</div>` : ''}
    </div>
    <div class="rx-badge">
      <div class="rx-badge-symbol">Rx</div>
      <div class="rx-badge-label">Prescription</div>
    </div>
  </div>

  <!-- META -->
  <div class="meta-row">
    <div class="meta-item"><span>Rx No.&nbsp;</span><strong>${rxNo}</strong></div>
    <div class="meta-item"><span>Date&nbsp;</span><strong>${now}</strong></div>
  </div>

  <!-- PATIENT -->
  <div class="patient-box">
    <div class="patient-box-title">Patient Details</div>
    <div class="patient-grid">
      <div class="patient-item">
        <span class="lbl">Name</span>
        <span class="val">${patientName}</span>
      </div>
      ${patientId ? `<div class="patient-item"><span class="lbl">Patient ID</span><span class="val">${patientId}</span></div>` : ''}
      ${patientAge ? `<div class="patient-item"><span class="lbl">Age</span><span class="val">${patientAge}</span></div>` : ''}
      ${patientGender ? `<div class="patient-item"><span class="lbl">Gender</span><span class="val">${patientGender}</span></div>` : ''}
    </div>
  </div>

  <!-- DIAGNOSIS -->
  ${diagnosis ? `
  <div class="diagnosis-box">
    <div class="diagnosis-label">Diagnosis</div>
    <div class="diagnosis-text">${diagnosis}</div>
  </div>
  ` : ''}

  <!-- MEDICATIONS -->
  <div class="meds-title">Medications Prescribed</div>

  ${medications && medications.length > 0 ? `
  <table class="meds-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Drug / Dosage / Instructions</th>
        <th style="text-align:right">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${medicationRows}
    </tbody>
  </table>
  ` : `
  <div class="no-meds">No medications listed</div>
  `}

  <!-- NOTES -->
  ${notes ? `
  <div class="notes-box">
    <div class="notes-label">📝 Special Instructions</div>
    <div class="notes-text">${notes}</div>
  </div>
  ` : ''}

  <!-- SIGNATURE -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-name">${doctorName}</div>
      <div class="signature-title">Prescribing Doctor</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="validity">Valid for 30 days from date of issue</div>
    <p>This prescription is issued by ${facilityName}</p>
    <p>Powered by AfyaScribe EMR · ${facilityPhone || ''}</p>
  </div>

</div>
</body>
</html>`;
}

/**
 * Print or share a prescription
 * @param {object} data - { patient, doctor, medications, notes, diagnosis, facility }
 *
 * medications array format:
 * [
 *   {
 *     name: 'Amoxicillin 500mg',
 *     dosage: '500mg',
 *     frequency: 'Three times daily',
 *     duration: '7 days',
 *     quantity: '21 tablets',
 *     instructions: 'Take with food'
 *   }
 * ]
 */
export async function printPrescription(data) {
  try {
    const html = buildPrescriptionHtml(data);

    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      w.print();
      return;
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Prescription',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Prescription print error:', error);
    Alert.alert('Print Error', 'Could not generate prescription. Please try again.');
  }
}