// src/utils/thermalPrinter.js
// ESC/POS Bluetooth thermal printer support for receipts & prescriptions
// Uses react-native-bluetooth-escpos-printer (must be installed as bare workflow)
// Falls back to PDF share if Bluetooth unavailable

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_PRINTER_KEY = '@saved_bluetooth_printer';

// ── ESC/POS Command constants ─────────────────────────────────────────────────
const ESC = '\x1B';
const GS  = '\x1D';

const CMD = {
  INIT:           ESC + '@',
  ALIGN_LEFT:     ESC + 'a\x00',
  ALIGN_CENTER:   ESC + 'a\x01',
  ALIGN_RIGHT:    ESC + 'a\x02',
  BOLD_ON:        ESC + 'E\x01',
  BOLD_OFF:       ESC + 'E\x00',
  DOUBLE_HEIGHT:  GS  + '!\x11',  // double height + double width
  NORMAL_SIZE:    GS  + '!\x00',
  UNDERLINE_ON:   ESC + '-\x01',
  UNDERLINE_OFF:  ESC + '-\x00',
  CUT:            GS  + 'V\x42\x00',
  FEED_3:         ESC + 'd\x03',
  FEED_1:         ESC + 'd\x01',
  LINE:           '\n',
};

// ── Get printer library (handles missing native module) ───────────────────────
function getPrinterLib() {
  try {
    // Try the most common ESC/POS library for React Native
    const lib = require('react-native-bluetooth-escpos-printer');
    return lib.default || lib;
  } catch (e) {
    try {
      const lib = require('@flysoft/react-native-thermal-printer');
      return lib.default || lib;
    } catch (e2) {
      return null;
    }
  }
}

// ── Save/load printer preference ──────────────────────────────────────────────
export async function savePrinterDevice(device) {
  await AsyncStorage.setItem(SAVED_PRINTER_KEY, JSON.stringify(device));
}

export async function getSavedPrinterDevice() {
  const raw = await AsyncStorage.getItem(SAVED_PRINTER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSavedPrinter() {
  await AsyncStorage.removeItem(SAVED_PRINTER_KEY);
}

// ── Text formatting helpers ───────────────────────────────────────────────────
const LINE_WIDTH = 32; // standard 58mm thermal paper

function padLine(left, right, width = LINE_WIDTH) {
  const spaces = width - left.length - right.length;
  if (spaces < 1) return left.substring(0, width - right.length - 1) + ' ' + right;
  return left + ' '.repeat(spaces) + right;
}

function centerText(text, width = LINE_WIDTH) {
  if (text.length >= width) return text;
  const spaces = Math.floor((width - text.length) / 2);
  return ' '.repeat(spaces) + text;
}

function divider(char = '-', width = LINE_WIDTH) {
  return char.repeat(width);
}

function wrapText(text, width = LINE_WIDTH) {
  if (!text || text.length <= width) return [text || ''];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= width) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word.length > width ? word.substring(0, width) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Build receipt ESC/POS text ────────────────────────────────────────────────
export function buildReceiptEscPos({ patient, bills, summary, facility, collectedBy }) {
  const facilityName = facility?.name || 'AfyaScribe Facility';
  const now = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const receiptNo = `RCP-${Date.now().toString().slice(-8)}`;
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';

  let text = '';

  // Header
  text += CMD.INIT;
  text += CMD.ALIGN_CENTER;
  text += CMD.BOLD_ON;
  text += CMD.DOUBLE_HEIGHT;
  text += facilityName.substring(0, LINE_WIDTH) + CMD.LINE;
  text += CMD.NORMAL_SIZE;
  text += CMD.BOLD_OFF;
  text += divider('=') + CMD.LINE;
  text += 'OFFICIAL RECEIPT' + CMD.LINE;
  text += divider('=') + CMD.LINE;
  text += CMD.LINE;

  // Receipt info
  text += CMD.ALIGN_LEFT;
  text += padLine('Receipt No:', receiptNo) + CMD.LINE;
  text += padLine('Date:', now) + CMD.LINE;
  text += CMD.LINE;

  // Patient
  text += CMD.BOLD_ON;
  text += 'PATIENT DETAILS' + CMD.LINE;
  text += CMD.BOLD_OFF;
  text += divider('-') + CMD.LINE;
  text += padLine('Name:', patientName.substring(0, 20)) + CMD.LINE;
  if (patient?.patientId) {
    text += padLine('Patient ID:', patient.patientId) + CMD.LINE;
  }
  if (patient?.membershipNo) {
    text += padLine('Membership:', patient.membershipNo) + CMD.LINE;
  }
  if (collectedBy) {
    text += padLine('Cashier:', collectedBy.substring(0, 18)) + CMD.LINE;
  }
  text += CMD.LINE;

  // Services
  text += CMD.BOLD_ON;
  text += 'SERVICES' + CMD.LINE;
  text += CMD.BOLD_OFF;
  text += divider('-') + CMD.LINE;

  for (const bill of bills || []) {
    const name = (bill.serviceDescription || bill.serviceType || 'Service').substring(0, 20);
    const amt = `KES ${Number(bill.amount).toLocaleString()}`;
    const status = bill.status === 'paid' ? '(Paid)' : bill.status === 'waived' ? '(Waived)' : bill.status === 'insurance_pending' ? '(Ins)' : '(Unpaid)';
    text += padLine(name, status) + CMD.LINE;
    text += padLine('', amt) + CMD.LINE;
  }

  text += divider('-') + CMD.LINE;

  // Totals
  const total = summary?.total || 0;
  const paid = summary?.amountPaid || summary?.paid || 0;
  const unpaid = summary?.unpaid || 0;

  text += CMD.BOLD_ON;
  text += padLine('TOTAL BILLED:', `KES ${Number(total).toLocaleString()}`) + CMD.LINE;
  text += padLine('COLLECTED:', `KES ${Number(paid).toLocaleString()}`) + CMD.LINE;
  if (unpaid > 0) {
    text += padLine('OUTSTANDING:', `KES ${Number(unpaid).toFixed(0)}`) + CMD.LINE;
  }
  text += CMD.BOLD_OFF;
  text += CMD.LINE;

  // Footer
  text += CMD.ALIGN_CENTER;
  text += divider('=') + CMD.LINE;
  text += 'Thank You!' + CMD.LINE;
  text += 'Please keep this receipt' + CMD.LINE;
  text += 'Powered by AfyaScribe' + CMD.LINE;
  text += CMD.LINE;
  text += CMD.FEED_3;
  text += CMD.CUT;

  return text;
}

// ── Build prescription ESC/POS text ──────────────────────────────────────────
export function buildPrescriptionEscPos({ patient, doctor, medications, notes, diagnosis, facility }) {
  const facilityName = facility?.name || 'AfyaScribe Facility';
  const facilityPhone = facility?.phone || '';
  const now = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const rxNo = `RX-${Date.now().toString().slice(-8)}`;
  const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Patient';
  const patientAge = patient?.age ? `${patient.age} yrs` : '';
  const patientGender = patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '';
  const doctorName = doctor ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Prescribing Doctor';

  let text = '';

  // Header
  text += CMD.INIT;
  text += CMD.ALIGN_CENTER;
  text += CMD.BOLD_ON;
  text += CMD.DOUBLE_HEIGHT;
  text += 'Rx' + CMD.LINE;
  text += CMD.NORMAL_SIZE;
  text += facilityName.substring(0, LINE_WIDTH) + CMD.LINE;
  if (facilityPhone) text += facilityPhone + CMD.LINE;
  text += CMD.BOLD_OFF;
  text += divider('=') + CMD.LINE;
  text += 'PRESCRIPTION' + CMD.LINE;
  text += divider('=') + CMD.LINE;
  text += CMD.LINE;

  // Meta
  text += CMD.ALIGN_LEFT;
  text += padLine('Rx No:', rxNo) + CMD.LINE;
  text += padLine('Date:', now) + CMD.LINE;
  text += CMD.LINE;

  // Patient
  text += CMD.BOLD_ON;
  text += 'PATIENT' + CMD.LINE;
  text += CMD.BOLD_OFF;
  text += divider('-') + CMD.LINE;
  text += padLine('Name:', patientName.substring(0, 20)) + CMD.LINE;
  if (patient?.patientId) text += padLine('ID:', patient.patientId) + CMD.LINE;
  if (patientAge) text += padLine('Age:', patientAge) + CMD.LINE;
  if (patientGender) text += padLine('Gender:', patientGender) + CMD.LINE;
  text += CMD.LINE;

  // Diagnosis
  if (diagnosis) {
    text += CMD.BOLD_ON;
    text += 'DIAGNOSIS' + CMD.LINE;
    text += CMD.BOLD_OFF;
    text += divider('-') + CMD.LINE;
    for (const line of wrapText(diagnosis)) {
      text += line + CMD.LINE;
    }
    text += CMD.LINE;
  }

  // Medications
  text += CMD.BOLD_ON;
  text += 'MEDICATIONS' + CMD.LINE;
  text += CMD.BOLD_OFF;
  text += divider('-') + CMD.LINE;

  (medications || []).forEach((med, idx) => {
    text += CMD.BOLD_ON;
    text += `${idx + 1}. ${(med.name || 'Medication').substring(0, 28)}` + CMD.LINE;
    text += CMD.BOLD_OFF;
    if (med.dosage) text += `   Dose: ${med.dosage}` + CMD.LINE;
    if (med.frequency) {
      for (const line of wrapText(`   Freq: ${med.frequency}`)) {
        text += line + CMD.LINE;
      }
    }
    if (med.duration) text += `   Duration: ${med.duration}` + CMD.LINE;
    if (med.quantity) text += `   Qty: ${med.quantity}` + CMD.LINE;
    if (med.instructions) {
      for (const line of wrapText(`   Note: ${med.instructions}`)) {
        text += line + CMD.LINE;
      }
    }
    text += CMD.LINE;
  });

  // Special instructions
  if (notes) {
    text += CMD.BOLD_ON;
    text += 'INSTRUCTIONS' + CMD.LINE;
    text += CMD.BOLD_OFF;
    text += divider('-') + CMD.LINE;
    for (const line of wrapText(notes)) {
      text += line + CMD.LINE;
    }
    text += CMD.LINE;
  }

  // Signature
  text += divider('-') + CMD.LINE;
  text += CMD.LINE;
  text += CMD.LINE;
  text += CMD.UNDERLINE_ON;
  text += ' '.repeat(LINE_WIDTH) + CMD.LINE;
  text += CMD.UNDERLINE_OFF;
  text += centerText(doctorName) + CMD.LINE;
  text += centerText('Prescribing Doctor') + CMD.LINE;
  text += CMD.LINE;

  // Footer
  text += CMD.ALIGN_CENTER;
  text += divider('=') + CMD.LINE;
  text += 'Valid for 30 days from date of issue' + CMD.LINE;
  text += 'Powered by AfyaScribe' + CMD.LINE;
  text += CMD.LINE;
  text += CMD.FEED_3;
  text += CMD.CUT;

  return text;
}

// ── Main print function (Bluetooth) ──────────────────────────────────────────
export async function printViaBluetooth(escPosText, printerDevice) {
  const lib = getPrinterLib();

  if (!lib) {
    throw new Error('Bluetooth printer library not available. Please install react-native-bluetooth-escpos-printer and rebuild the app.');
  }

  try {
    // Connect to the printer
    await lib.BluetoothManager.connect(printerDevice.address);

    // Print
    await lib.BluetoothEscposPrinter.printText(escPosText, {});

    return { success: true };
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw new Error(`Print failed: ${error.message}`);
  }
}

// ── Scan for Bluetooth printers ───────────────────────────────────────────────
export async function scanForPrinters() {
  const lib = getPrinterLib();

  if (!lib) {
    throw new Error('Bluetooth printer library not available.');
  }

  if (Platform.OS === 'android') {
    // Check/request permissions
    try {
      const { PermissionsAndroid } = require('react-native');
      if (Platform.Version >= 31) {
        await PermissionsAndroid.requestMultiple([
          'android.permission.BLUETOOTH_SCAN',
          'android.permission.BLUETOOTH_CONNECT',
        ]);
      } else {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }
    } catch (e) {
      console.warn('Permission request failed:', e);
    }
  }

  try {
    const devices = await lib.BluetoothManager.scanDevices();
    const paired = devices?.paired || [];
    const found = devices?.found || [];
    return [...paired, ...found].filter((d, i, arr) =>
      arr.findIndex(x => x.address === d.address) === i
    );
  } catch (error) {
    throw new Error(`Scan failed: ${error.message}`);
  }
}

// ── Check if Bluetooth printing is available ──────────────────────────────────
export function isBluetoothPrintingAvailable() {
  return getPrinterLib() !== null;
}

export default {
  buildReceiptEscPos,
  buildPrescriptionEscPos,
  printViaBluetooth,
  scanForPrinters,
  savePrinterDevice,
  getSavedPrinterDevice,
  clearSavedPrinter,
  isBluetoothPrintingAvailable,
};