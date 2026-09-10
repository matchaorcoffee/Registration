import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ExcelAttendeeRow, ColumnMapping, Registration, RSVPStatus } from '../models/event.model';
import { RegistrationService } from './registration.service';

export interface ParsedSheetData {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  rows: ExcelAttendeeRow[];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {

  constructor(private registrationService: RegistrationService) {}

  /**
   * Reads an uploaded .xlsx / .xls file into headers and objects
   */
  public async parseExcelFile(file: File): Promise<ParsedSheetData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            return resolve({ headers: [], rawRows: [], detectedMapping: this.getEmptyMapping() });
          }

          const headers = Object.keys(rawRows[0]);
          const detectedMapping = this.autoDetectColumnMapping(headers);

          resolve({
            headers,
            rawRows,
            detectedMapping
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Intelligently auto-maps columns based on common synonyms
   */
  public autoDetectColumnMapping(headers: string[]): ColumnMapping {
    const mapping = this.getEmptyMapping();

    const findMatch = (patterns: RegExp[]): string => {
      for (const h of headers) {
        const clean = h.trim().toLowerCase();
        for (const p of patterns) {
          if (p.test(clean)) return h;
        }
      }
      return '';
    };

    mapping.fullName = findMatch([/^full\s*name$/i, /^name$/i, /^guest\s*name$/i, /^attendee$/i]);
    mapping.firstName = findMatch([/^first\s*name$/i, /^fname$/i, /^given\s*name$/i]);
    mapping.lastName = findMatch([/^last\s*name$/i, /^lname$/i, /^surname$/i, /^family\s*name$/i]);
    mapping.email = findMatch([/^email$/i, /^e-mail$/i, /^email\s*address$/i, /^mail$/i]);
    mapping.phone = findMatch([/^phone$/i, /^mobile$/i, /^contact$/i, /^contact\s*number$/i, /^cell$/i, /^tel$/i]);
    mapping.company = findMatch([/^company$/i, /^organization$/i, /^org$/i, /^workplace$/i, /^business$/i]);
    mapping.jobTitle = findMatch([/^job\s*title$/i, /^position$/i, /^role$/i, /^title$/i, /^designation$/i]);
    mapping.rsvpStatus = findMatch([/^rsvp$/i, /^status$/i, /^attendance$/i, /^attending\?$/i]);
    mapping.dietary = findMatch([/^dietary$/i, /^diet$/i, /^food$/i, /^meal$/i, /^dietary\s*preferences?$/i]);

    return mapping;
  }

  /**
   * Validates parsed spreadsheet rows according to the selected column mapping and detects duplicates
   */
  public validateRows(
    rawRows: Record<string, any>[],
    mapping: ColumnMapping,
    eventId: string
  ): ImportValidationSummary {
    const existingRegistrations = this.registrationService.getRegistrationsForEvent(eventId);
    const existingEmails = new Set(existingRegistrations.filter(r => r.email).map(r => r.email.toLowerCase()));
    const existingNames = new Set(existingRegistrations.filter(r => r.firstName || r.lastName).map(r => `${r.firstName} ${r.lastName}`.trim().toLowerCase()));
    
    // Existing custom IDs / primary key values
    const existingPrimaryKeys = new Set<string>();
    for (const reg of existingRegistrations) {
      if (reg.customAnswers) {
        for (const ca of reg.customAnswers) {
          if (ca.answer) existingPrimaryKeys.add(String(ca.answer).trim().toLowerCase());
        }
      }
    }

    // In-batch tracking to prevent duplicates inside the same uploaded Excel file
    const seenBatchPrimaryKeys = new Set<string>();
    const seenBatchEmails = new Set<string>();
    const seenBatchNames = new Set<string>();

    const processedRows: ExcelAttendeeRow[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of rawRows) {
      let firstName = '';
      let lastName = '';

      if (mapping.firstName && row[mapping.firstName]) {
        firstName = String(row[mapping.firstName]).trim();
      }
      if (mapping.lastName && row[mapping.lastName]) {
        lastName = String(row[mapping.lastName]).trim();
      }
      // If full name column was used instead
      if (!firstName && mapping.fullName && row[mapping.fullName]) {
        const full = String(row[mapping.fullName]).trim();
        const parts = full.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      const email = mapping.email && row[mapping.email] ? String(row[mapping.email]).trim().toLowerCase() : '';
      const phone = mapping.phone && row[mapping.phone] ? String(row[mapping.phone]).trim() : '';
      const company = mapping.company && row[mapping.company] ? String(row[mapping.company]).trim() : '';
      const jobTitle = mapping.jobTitle && row[mapping.jobTitle] ? String(row[mapping.jobTitle]).trim() : '';
      const dietary = mapping.dietary && row[mapping.dietary] ? String(row[mapping.dietary]).trim() : '';
      
      let rsvpStatus: RSVPStatus = 'pending';
      if (mapping.rsvpStatus && row[mapping.rsvpStatus]) {
        const rVal = String(row[mapping.rsvpStatus]).trim().toLowerCase();
        if (rVal.includes('attend') || rVal.includes('yes') || rVal.includes('confirmed')) rsvpStatus = 'attending';
        else if (rVal.includes('maybe')) rsvpStatus = 'maybe';
        else if (rVal.includes('decline') || rVal.includes('no') || rVal.includes('unable')) rsvpStatus = 'declined';
      }

      // Collect custom mapped column answers and determine primary key value
      let primaryKeyValue = '';
      const customAnswers: any[] = [];
      if (mapping.customColumns && mapping.customColumns.length) {
        for (const col of mapping.customColumns) {
          if (col.sheetHeader && row[col.sheetHeader] !== undefined) {
            const answerStr = String(row[col.sheetHeader]).trim();
            customAnswers.push({
              questionId: col.id,
              questionText: col.fieldLabel,
              answer: answerStr
            });
            if (mapping.primaryKeyColumn === col.id) {
              primaryKeyValue = answerStr;
            }
          }
        }
      }

      // If standard column was selected as primary key
      if (!primaryKeyValue && mapping.primaryKeyColumn) {
        if (mapping.primaryKeyColumn === 'email' && email) primaryKeyValue = email;
        else if (mapping.primaryKeyColumn === 'firstName' && firstName) primaryKeyValue = firstName;
        else if (mapping.primaryKeyColumn === 'fullName' && (firstName || lastName)) primaryKeyValue = `${firstName} ${lastName}`.trim();
        else if (mapping.primaryKeyColumn === 'phone' && phone) primaryKeyValue = phone;
      }

      const errors: string[] = [];
      const requiredCols = new Set(mapping.requiredColumns || []);

      // Validate required standard columns
      if (requiredCols.has('firstName') && !firstName) errors.push('"First Name" is required but is empty');
      if (requiredCols.has('lastName') && !lastName) errors.push('"Last Name" is required but is empty');
      if (requiredCols.has('fullName') && !firstName && !lastName) errors.push('"Full Name" is required but is empty');
      if (requiredCols.has('email') && !email) errors.push('"Email" is required but is empty');
      if (requiredCols.has('phone') && !phone) errors.push('"Phone" is required but is empty');
      if (requiredCols.has('company') && !company) errors.push('"Company" is required but is empty');
      if (requiredCols.has('jobTitle') && !jobTitle) errors.push('"Job Title" is required but is empty');
      if (requiredCols.has('dietary') && !dietary) errors.push('"Dietary Preferences" is required but is empty');

      // Validate required custom columns
      if (mapping.customColumns && mapping.customColumns.length) {
        for (const col of mapping.customColumns) {
          if (requiredCols.has(col.id) && col.sheetHeader) {
            const val = row[col.sheetHeader] !== undefined ? String(row[col.sheetHeader]).trim() : '';
            if (!val) {
              errors.push(`"${col.fieldLabel}" is required but is empty`);
            }
          }
        }
      }

      // If email is provided, validate its format
      if (email && !emailRegex.test(email)) {
        errors.push('Invalid email address format');
      }

      // DUPLICATE DETECTION LOGIC
      let isDuplicate = false;
      const cleanPk = primaryKeyValue.toLowerCase().trim();
      const cleanName = `${firstName} ${lastName}`.toLowerCase().trim();

      if (cleanPk) {
        // Strict Primary Key duplicate check (against database + current batch)
        if (existingPrimaryKeys.has(cleanPk) || seenBatchPrimaryKeys.has(cleanPk)) {
          isDuplicate = true;
          errors.push(`Duplicate primary key / ID "${primaryKeyValue}" detected`);
        }
      } else if (email) {
        if (existingEmails.has(email) || seenBatchEmails.has(email)) {
          isDuplicate = true;
          errors.push(`Duplicate email "${email}" detected`);
        }
      } else if (cleanName && cleanName !== 'guest attendee') {
        if (existingNames.has(cleanName) || seenBatchNames.has(cleanName)) {
          isDuplicate = true;
          errors.push(`Duplicate name "${firstName} ${lastName}" detected`);
        }
      }

      // Add to seen batch sets to catch intra-file duplicates
      if (cleanPk) seenBatchPrimaryKeys.add(cleanPk);
      if (email) seenBatchEmails.add(email);
      if (cleanName) seenBatchNames.add(cleanName);

      const isValid = errors.filter(e => !e.startsWith('Duplicate')).length === 0;

      if (!isValid) invalidCount++;
      else if (isDuplicate) duplicateCount++;
      else validCount++;

      processedRows.push({
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        rsvpStatus,
        dietaryPreferences: dietary,
        customAnswers,
        raw: row,
        isValid,
        errors,
        isDuplicate,
        duplicateResolution: isDuplicate ? 'skip' : undefined,
        invalidResolution: !isValid ? 'remove' : undefined
      });
    }

    return {
      totalRows: rawRows.length,
      validRows: validCount,
      duplicateRows: duplicateCount,
      invalidRows: invalidCount,
      rows: processedRows
    };
  }

  /**
   * Exports an array of registrations to an Excel (.xlsx) file download
   */
  public exportRegistrationsToExcel(registrations: Registration[], eventName: string): void {
    const exportData = registrations.map(r => ({
      'Registration ID': r.id,
      'First Name': r.firstName,
      'Last Name': r.lastName,
      'Full Name': `${r.firstName} ${r.lastName}`,
      'Email Address': r.email,
      'Mobile / Phone': r.phone || '',
      'Company / Organization': r.company || '',
      'Job Title': r.jobTitle || '',
      'RSVP Status': r.rsvpStatus.toUpperCase(),
      'Registration Type': r.registrationType.toUpperCase(),
      'Registration Source': r.registrationSource.toUpperCase(),
      'Registration Date': new Date(r.registrationDate).toLocaleDateString() + ' ' + new Date(r.registrationDate).toLocaleTimeString(),
      'Checked In': r.checkInStatus ? 'YES' : 'NO',
      'Check-In Time': r.checkInTime ? (new Date(r.checkInTime).toLocaleDateString() + ' ' + new Date(r.checkInTime).toLocaleTimeString()) : 'N/A',
      'Checked In By': r.checkedInBy || 'N/A',
      'QR Token': r.qrToken
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');

    // Generate safe filename
    const safeName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeName}_attendees_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }

  private getEmptyMapping(): ColumnMapping {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      rsvpStatus: '',
      dietary: '',
      customColumns: []
    };
  }
}
