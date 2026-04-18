// src/utils/printReceipt.js
// UPDATED: Bluetooth ESC/POS thermal printing + PDF fallback
// Shows print method selector (Bluetooth / PDF) before printing

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import {
  buildReceiptEscPos,
  printViaBluetooth,
  getSavedPrinterDevice,
  isBluetoothPrintingAvailable,
} from './thermalPrinter';

/**
 * Generate HTML receipt (for PDF fallback)
 */
function buildReceiptHtml({ patient, visit, bills, summary, facility, collectedBy }) {
  const now = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const receiptNo = `RCP-${Date.now().toString().slice(-8)}`;
  const facilityName = facility?.name || 'AfyaScribe Facility';
  const facilityPhone = facility?.phone || '';
  const facilityAddress = facility?.address || '';

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Patient';
  const patientId = patient?.patientId || '';
  const membershipNo = patient?.membershipNo || '';

  const billRows = (bills || []).map((bill) => {
    const status = bill.status === 'paid' ? 'Paid' : bill.status === 'waived' ? 'Waived' : bill.status === 'insurance_pending' ? 'Insurance' : 'Unpaid';
    const amount = parseFloat(bill.amount || 0);
    return `
      <tr>
        <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;">
          ${bill.serviceDescription || bill.serviceType}
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;text-align:center;">
          <span style="background:${bill.status === 'paid' ? '#dcfce7' : '#fee2e2'};color:${bill.status === 'paid' ? '#166534' : '#dc2626'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">
            ${status}
          </span>
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">
          KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </td>
      </tr>`;
  }).join('');

  const total = summary?.total || 0;
  const paid = summary?.paid || summary?.amountPaid || 0;
  const unpaid = summary?.unpaid || 0;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; }
  .page { max-width: 400px; margin: 0 auto; padding: 24px; }
  .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 16px; }
  .facility-name { font-size: 20px; font-weight: 800; color: #0f766e; }
  .facility-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .receipt-badge { display: inline-block; background: #0f766e; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 3px 10px; border-radius: 12px; margin-top: 8px; }
  .section { margin: 14px 0; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .info-item { font-size: 13px; }
  .info-item .lbl { color: #64748b; font-size: 11px; }
  .info-item .val { font-weight: 600; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; padding: 6px 4px; border-bottom: 2px solid #e2e8f0; }
  th:last-child { text-align: right; }
  .totals { margin-top: 12px; border-top: 2px solid #0f766e; padding-top: 10px; }
  .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
  .total-row.grand { font-size: 16px; font-weight: 800; color: #0f766e; margin-top: 6px; }
  .total-row.unpaid { color: #dc2626; }
  .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 14px; }
  .footer p { font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
  .thank-you { font-size: 15px; font-weight: 700; color: #0f766e; margin-bottom: 6px; }
  @media print { body { print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="facility-name">🏥 ${facilityName}</div>
    ${facilityAddress ? `<div class="facility-sub">${facilityAddress}</div>` : ''}
    ${facilityPhone ? `<div class="facility-sub">Tel: ${facilityPhone}</div>` : ''}
    <div><span class="receipt-badge">Official Receipt</span></div>
  </div>
  <div class="section">
    <div class="info-grid">
      <div class="info-item"><div class="lbl">Receipt No.</div><div class="val">${receiptNo}</div></div>
      <div class="info-item"><div class="lbl">Date &amp; Time</div><div class="val">${now}</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Patient Details</div>
    <div class="info-grid">
      <div class="info-item"><div class="lbl">Name</div><div class="val">${patientName}</div></div>
      ${patientId ? `<div class="info-item"><div class="lbl">Patient ID</div><div class="val">${patientId}</div></div>` : ''}
      ${membershipNo ? `<div class="info-item"><div class="lbl">Membership No.</div><div class="val">${membershipNo}</div></div>` : ''}
      ${collectedBy ? `<div class="info-item"><div class="lbl">Cashier</div><div class="val">${collectedBy}</div></div>` : ''}
    </div>
  </div>
  <div class="section">
    <div class="section-label">Services</div>
    <table>
      <thead><tr><th>Description</th><th style="text-align:center;">Status</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${billRows}</tbody>
    </table>
  </div>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
    <div class="total-row"><span>Paid</span><span style="color:#166534;font-weight:600;">KES ${paid.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
    ${unpaid > 0 ? `<div class="total-row unpaid"><span>Outstanding</span><span>KES ${unpaid.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>` : ''}
    <div class="total-row grand"><span>TOTAL BILLED</span><span>KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
  </div>
  <div class="footer">
    <div class="thank-you">Thank You!</div>
    <p>Please keep this receipt for your records.</p>
    <p>Powered by AfyaScribe EMR</p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Print via PDF (share sheet)
 */
async function printAsPdf(data) {
  const html = buildReceiptHtml(data);

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
      dialogTitle: 'Receipt',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}

/**
 * Print via Bluetooth thermal printer
 */
async function printAsThermal(data, printerDevice) {
  const escPosText = buildReceiptEscPos(data);
  await printViaBluetooth(escPosText, printerDevice);
}

/**
 * Main print receipt function
 * Shows a chooser: Bluetooth thermal or PDF
 * @param {object} data - { patient, visit, bills, summary, facility, collectedBy }
 * @param {object} options - { onNeedPrinterSetup: fn } callback if no printer saved
 */
export async function printReceipt(data, options = {}) {
  try {
    const bluetoothAvailable = isBluetoothPrintingAvailable();
    const savedPrinter = await getSavedPrinterDevice();

    // If Bluetooth is available and we have a saved printer, offer choice
    if (bluetoothAvailable && savedPrinter) {
      return new Promise((resolve) => {
        Alert.alert(
          'Print Receipt',
          `Choose print method:`,
          [
            {
              text: `🖨️ Thermal (${savedPrinter.name || savedPrinter.address})`,
              onPress: async () => {
                try {
                  await printAsThermal(data, savedPrinter);
                  resolve({ success: true, method: 'bluetooth' });
                } catch (e) {
                  Alert.alert(
                    'Bluetooth Print Failed',
                    `${e.message}\n\nFall back to PDF?`,
                    [
                      { text: 'Yes, PDF', onPress: async () => { await printAsPdf(data); resolve({ success: true, method: 'pdf' }); } },
                      { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false }) },
                    ]
                  );
                }
              },
            },
            {
              text: '📄 PDF / Share',
              onPress: async () => {
                await printAsPdf(data);
                resolve({ success: true, method: 'pdf' });
              },
            },
            {
              text: 'Change Printer',
              onPress: () => {
                options.onNeedPrinterSetup?.();
                resolve({ success: false, openSettings: true });
              },
            },
          ],
        );
      });
    }

    // If Bluetooth is available but no printer saved, offer to set up or use PDF
    if (bluetoothAvailable && !savedPrinter) {
      return new Promise((resolve) => {
        Alert.alert(
          'Print Receipt',
          'No Bluetooth printer configured.',
          [
            {
              text: '🖨️ Set Up Printer',
              onPress: () => {
                options.onNeedPrinterSetup?.();
                resolve({ success: false, openSettings: true });
              },
            },
            {
              text: '📄 Print as PDF',
              onPress: async () => {
                await printAsPdf(data);
                resolve({ success: true, method: 'pdf' });
              },
            },
            { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false }) },
          ]
        );
      });
    }

    // Bluetooth not available — PDF only
    await printAsPdf(data);
    return { success: true, method: 'pdf' };

  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', 'Could not generate receipt. Please try again.');
    return { success: false };
  }
}

/**
 * Quick print button component hook — returns handler
 */
export function usePrintReceipt(visitId, patient, onNeedPrinterSetup) {
  return async () => {
    try {
      const apiService = require('../services/apiService').default;
      const [bills, summary] = await Promise.all([
        apiService.getVisitBills(visitId),
        apiService.getVisitBillingSummary(visitId),
      ]);
      await printReceipt({ patient, bills, summary }, { onNeedPrinterSetup });
    } catch (e) {
      Alert.alert('Error', 'Could not load bill data for printing.');
    }
  };
}