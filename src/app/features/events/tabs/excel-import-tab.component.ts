import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExcelImportService, ParsedSheetData, ImportValidationSummary } from '../../../core/services/excel-import.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { EventService } from '../../../core/services/event.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, ColumnMapping, ExcelAttendeeRow } from '../../../core/models/event.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-excel-import-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="excel-import-tab" *ngIf="event">
      <!-- Top Overview Header -->
      <div class="import-header-card flat-card mb-6">
        <div class="flex justify-between items-start">
          <div>
            <span class="step-tag">BULK REGISTRATION INGESTION</span>
            <h2 class="card-title">Import Attendees from Excel (.xlsx / .xls)</h2>
            <p class="text-muted text-sm">
              Upload existing spreadsheet attendee lists, intelligently map varied column names, review duplicate detections, and batch generate secure QR passes.
            </p>
          </div>
        </div>

        <!-- 4-Stage Stepper -->
        <div class="import-stepper mt-4">
          <div class="step-item" [class.active]="step === 1" [class.done]="step > 1">
            <span class="step-circle">1</span>
            <span>Upload File</span>
          </div>
          <div class="step-line" [class.active]="step > 1"></div>
          <div class="step-item" [class.active]="step === 2" [class.done]="step > 2">
            <span class="step-circle">2</span>
            <span>Map Columns</span>
          </div>
          <div class="step-line" [class.active]="step > 2"></div>
          <div class="step-item" [class.active]="step === 3" [class.done]="step > 3">
            <span class="step-circle">3</span>
            <span>Preview & Validate</span>
          </div>
          <div class="step-line" [class.active]="step > 3"></div>
          <div class="step-item" [class.active]="step === 4">
            <span class="step-circle">4</span>
            <span>Confirm & QR Tokens</span>
          </div>
        </div>
      </div>

      <!-- STEP 1: FILE UPLOAD -->
      <div *ngIf="step === 1" class="step-content">
        <div 
          class="upload-dropzone flat-card"
          (dragover)="onDragOver($event)"
          (dragleave)="isDragging = false"
          (drop)="onDrop($event)"
          [class.drag-active]="isDragging"
        >
          <div *ngIf="hasSavedMapping" class="mb-3">
            <span class="badge badge-emerald">
              ⚡ Saved Column Schema Active &mdash; Subsequent uploads auto-skip mapping
            </span>
          </div>

          <div class="drop-icon">📊</div>
          <h3 class="drop-title">Select or Drag Excel Spreadsheet Here</h3>
          <p class="text-muted text-sm mb-4">Supports .xlsx, .xls formats (any column naming schema)</p>

          <input
            type="file"
            #fileInput
            (change)="onFileSelected($event)"
            accept=".xlsx, .xls"
            style="display: none;"
          />
          <button (click)="fileInput.click()" class="btn btn-primary btn-lg">
            📂 Choose Spreadsheet File
          </button>

        </div>
      </div>

      <!-- STEP 2: COLUMN MAPPING & CUSTOM ATTRIBUTES -->
      <div *ngIf="step === 2" class="step-content">
        <div class="flat-card">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="card-heading">Smart Column Mapping & Arrangement</h3>
              <p class="text-muted text-sm">Match your spreadsheet headers to Evently fields, add custom mappings, and arrange column priority.</p>
            </div>
            <div class="flex gap-2 items-center">
              <button (click)="addCustomColumnMapping()" class="btn btn-secondary btn-sm">
                ➕ Add Custom Column Mapping
              </button>
              <button *ngIf="hasSavedMapping" (click)="clearSavedMappingPreset()" class="btn btn-outline btn-sm text-xs" title="Reset saved column template to defaults">
                🔄 Reset Mapping Preset
              </button>
              <span class="badge badge-primary">{{ sheetHeaders.length }} Columns Detected</span>
            </div>
          </div>

          <!-- Primary Key / Unique Identifier Selector Banner -->
          <div class="p-3 bg-amber-light border rounded-lg mb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <strong class="text-xs text-amber-dark uppercase tracking-wider block">🔑 Select Primary Key / Unique Identifier Column:</strong>
              <p class="text-xs text-muted">Choose which field (e.g. ID Number, Student ID, Email) must be uniquely enforced to prevent duplicate attendees.</p>
            </div>
            <div class="flex items-center gap-2">
              <select class="form-control form-control-sm" [(ngModel)]="primaryKeyColumnKey">
                <option value="">Auto-Detect (Email / Name)</option>
                <option *ngFor="let r of mappingRows" [value]="r.key">
                  {{ r.label || r.key }} ({{ r.selectedHeader || 'Unmapped' }})
                </option>
              </select>
            </div>
          </div>

          <!-- Mapping Rows List with Reordering -->
          <div class="mapping-grid">
            <div
              *ngFor="let row of mappingRows; let i = index"
              class="mapping-row"
              [class.custom-field-row]="row.isCustom"
            >
              <div class="reorder-controls">
                <button
                  type="button"
                  class="btn-icon-tiny"
                  (click)="moveRowUp(i)"
                  [disabled]="i === 0"
                  title="Move Up"
                >▲</button>
                <button
                  type="button"
                  class="btn-icon-tiny"
                  (click)="moveRowDown(i)"
                  [disabled]="i === mappingRows.length - 1"
                  title="Move Down"
                >▼</button>
              </div>

              <!-- Standard Field Info (editable name & custom field description) -->
              <div *ngIf="!row.isCustom" class="field-info">
                <input
                  type="text"
                  class="form-control form-control-sm field-name-input"
                  [(ngModel)]="row.label"
                  placeholder="Column Name"
                />
                <p class="text-xs text-muted">{{ row.description }}</p>
              </div>

              <!-- Custom Field Editor Info -->
              <div *ngIf="row.isCustom" class="field-info custom-label-input">
                <div class="flex items-center gap-2">
                  <span class="badge badge-secondary text-xs">Custom</span>
                  <input
                    type="text"
                    class="form-control form-control-sm field-name-input"
                    [(ngModel)]="row.label"
                    placeholder="Field name (e.g. ID, VIP Level, T-Shirt)"
                  />
                </div>
                <p class="text-xs text-muted">Custom question / attendee attribute</p>
              </div>

              <!-- Header Select -->
              <div class="mapping-select-group">
                <select class="form-control" [(ngModel)]="row.selectedHeader">
                  <option value="">-- Leave Unmapped --</option>
                  <option *ngFor="let h of sheetHeaders" [value]="h">{{ h }}</option>
                </select>
              </div>

              <!-- Delete / Remove Column Button -->
              <div class="mapping-action">
                <button
                  type="button"
                  (click)="removeMappingRow(row.key)"
                  class="btn btn-coral btn-xs"
                  title="Delete/Remove column from mapping"
                >✕</button>
              </div>
            </div>
          </div>

          <div class="step-nav-actions flex justify-between items-center mt-6">
            <button (click)="step = 1" class="btn btn-secondary">← Back to File</button>
            <button (click)="proceedToPreview()" class="btn btn-primary btn-lg">
              Validate & Preview Rows →
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 3: PREVIEW, VALIDATE & DUPLICATE RESOLVER -->
      <div *ngIf="step === 3 && validationSummary" class="step-content">
        <!-- Auto-Mapped Notification Banner -->
        <div *ngIf="isAutoMapped" class="p-3 bg-primary-light border rounded-md mb-4 flex justify-between items-center">
          <div class="text-xs text-primary font-bold">
            ⚡ Applied your saved column mapping automatically. You can proceed directly to import or adjust mapping below if needed.
          </div>
          <button (click)="step = 2" class="btn btn-secondary btn-xs">
            ✏️ Adjust Column Mapping
          </button>
        </div>

        <!-- Validation Summary Card -->
        <div class="flat-card mb-6">
          <div class="grid grid-cols-4 gap-4 text-center">
            <div class="p-3 bg-gray-50 border rounded-md">
              <span class="text-xs font-bold text-gray-500 uppercase">Total Rows Found</span>
              <div class="text-2xl font-extrabold text-dark mt-1">{{ validationSummary.totalRows }}</div>
            </div>

            <div class="p-3 bg-emerald-light border rounded-md">
              <span class="text-xs font-bold text-emerald-dark uppercase">✓ Valid Records</span>
              <div class="text-2xl font-extrabold text-emerald-dark mt-1">{{ validationSummary.validRows }}</div>
            </div>

            <div class="p-3 bg-amber-light border rounded-md">
              <span class="text-xs font-bold text-amber-dark uppercase">⚠ Duplicates Detected</span>
              <div class="text-2xl font-extrabold text-amber-dark mt-1">{{ validationSummary.duplicateRows }}</div>
            </div>

            <div class="p-3 bg-coral-light border rounded-md">
              <span class="text-xs font-bold text-coral-dark uppercase">✕ Invalid Rows</span>
              <div class="text-2xl font-extrabold text-coral-dark mt-1">{{ validationSummary.invalidRows }}</div>
            </div>
          </div>
        </div>

        <!-- Preview Rows Table -->
        <div class="flat-table-container mb-6">
          <table class="flat-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Attendee Name</th>
                <th *ngIf="hasColumnValue('email')">{{ getColumnLabel('email', 'Email Address') }}</th>
                <th *ngIf="hasColumnValue('company')">{{ getColumnLabel('company', 'Company') }}</th>
                <th *ngIf="hasColumnValue('jobTitle')">{{ getColumnLabel('jobTitle', 'Job Title') }}</th>
                <th *ngIf="hasColumnValue('phone')">{{ getColumnLabel('phone', 'Phone') }}</th>
                <th *ngIf="hasColumnValue('dietary')">{{ getColumnLabel('dietary', 'Dietary') }}</th>
                <th *ngFor="let cCol of getActiveCustomColumns()">{{ cCol.fieldLabel }}</th>
                <th>Duplicate Handling</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of validationSummary.rows">
                <td>
                  <span *ngIf="row.isValid && !row.isDuplicate" class="badge badge-emerald">Valid</span>
                  <span *ngIf="row.isDuplicate" class="badge badge-amber">Duplicate</span>
                  <span *ngIf="!row.isValid" class="badge badge-coral">Invalid</span>
                </td>
                <td>
                  <strong>{{ (row.firstName || row.lastName) ? (row.firstName + ' ' + row.lastName).trim() : 'Guest Attendee' }}</strong>
                  <div *ngIf="row.errors && row.errors.length" class="text-xs text-coral">
                    {{ row.errors.join(', ') }}
                  </div>
                  <div *ngIf="!hasAnyMappedColumnsExceptName() && row.customAnswers && row.customAnswers.length" class="text-xs text-muted mt-1">
                    <span *ngFor="let ca of row.customAnswers" class="badge badge-secondary text-xs mr-1">
                      {{ ca.questionText }}: {{ ca.answer }}
                    </span>
                  </div>
                </td>
                <td *ngIf="hasColumnValue('email')" class="font-mono text-xs">{{ row.email || '—' }}</td>
                <td *ngIf="hasColumnValue('company')">{{ row.company || '—' }}</td>
                <td *ngIf="hasColumnValue('jobTitle')">{{ row.jobTitle || '—' }}</td>
                <td *ngIf="hasColumnValue('phone')">{{ row.phone || '—' }}</td>
                <td *ngIf="hasColumnValue('dietary')">{{ row.dietaryPreferences || '—' }}</td>
                <td *ngFor="let cCol of getActiveCustomColumns()">
                  {{ getCustomAnswerValue(row, cCol.id) || '—' }}
                </td>
                <td>
                  <select *ngIf="row.isDuplicate" class="form-control text-xs" [(ngModel)]="row.duplicateResolution">
                    <option value="skip">Skip Row</option>
                    <option value="update">Update Existing</option>
                    <option value="import-anyway">Import Anyway</option>
                  </select>
                  <span *ngIf="!row.isDuplicate && row.isValid" class="text-xs text-emerald font-bold">Ready</span>
                  <span *ngIf="!row.isValid" class="text-xs text-coral">Skipped (errors)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="step-nav-actions flex justify-between items-center">
          <button (click)="step = 2" class="btn btn-secondary">← Adjust Column Mapping</button>
          <button (click)="confirmImport()" [disabled]="isImporting" class="btn btn-emerald btn-lg">
            <span *ngIf="!isImporting">✓ Confirm & Generate {{ getImportableCount() }} QR Passes</span>
            <span *ngIf="isImporting">Generating Passes...</span>
          </button>
        </div>
      </div>

      <!-- STEP 4: IMPORT COMPLETED SUMMARY -->
      <div *ngIf="step === 4" class="step-content">
        <div class="flat-card text-center py-8">
          <div class="success-check-icon">✓</div>
          <h2 class="text-2xl font-extrabold text-dark mt-3">Excel Ingestion Complete!</h2>
          <p class="text-muted text-sm mt-1 max-w-md mx-auto">
            Successfully imported <strong>{{ importedCount }} attendees</strong> into {{ event.name }}. Unique registration IDs and secure QR tokens have been assigned.
          </p>

          <div class="flex justify-center gap-3 mt-6">
            <a [routerLink]="['/events', event.id, 'attendees']" class="btn btn-primary btn-lg">
              👥 View Unified Attendee List
            </a>
            <a [routerLink]="['/events', event.id, 'check-in']" class="btn btn-emerald btn-lg">
              📷 Open Check-In Terminal
            </a>
            <button (click)="resetForNextImport()" class="btn btn-secondary">
              Import Another Spreadsheet
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .excel-import-tab {
      display: flex;
      flex-direction: column;
    }
    .import-header-card {
      background: var(--flat-white);
    }
    .step-tag {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--flat-indigo);
      letter-spacing: 0.08em;
    }
    .card-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0.2rem 0;
    }
    .import-stepper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--flat-border);
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--flat-gray-400);
    }
    .step-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--flat-gray-200);
      color: var(--flat-gray-700);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .step-item.active {
      color: var(--flat-primary);
    }
    .step-item.active .step-circle {
      background: var(--flat-primary);
      color: var(--flat-white);
    }
    .step-item.done .step-circle {
      background: var(--flat-emerald);
      color: var(--flat-white);
    }
    .step-line {
      flex: 1;
      height: 2px;
      background: var(--flat-gray-200);
    }
    .step-line.active {
      background: var(--flat-emerald);
    }
    .upload-dropzone {
      border: 3px dashed var(--flat-border-dark);
      border-radius: var(--radius-xl);
      padding: 4rem 2rem;
      text-align: center;
      background: var(--flat-white);
      transition: all 0.2s ease;
    }
    .upload-dropzone.drag-active {
      border-color: var(--flat-primary);
      background: var(--flat-primary-light);
    }
    .drop-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    .drop-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .mapping-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    .mapping-row {
      display: grid;
      grid-template-columns: auto 1.2fr 1fr auto;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      transition: background 0.15s ease;
    }
    .mapping-row.custom-field-row {
      background: #fdfaf0;
      border-color: #fde68a;
    }
    .reorder-controls {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .btn-icon-tiny {
      padding: 2px 5px;
      font-size: 0.65rem;
      line-height: 1;
      background: var(--flat-white);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--flat-gray-700);
      transition: all 0.15s;
    }
    .btn-icon-tiny:hover:not(:disabled) {
      background: var(--flat-primary);
      color: var(--flat-white);
      border-color: var(--flat-primary);
    }
    .btn-icon-tiny:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .field-name-input {
      font-weight: 700;
      color: var(--flat-dark);
      padding: 0.35rem 0.5rem;
      font-size: 0.875rem;
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-sm);
      margin-bottom: 0.2rem;
    }
    .field-name-input:focus {
      border-color: var(--flat-primary);
      background: var(--flat-white);
    }
    .custom-label-input input {
      padding: 0.35rem 0.5rem;
      font-size: 0.85rem;
    }
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .success-check-icon {
      width: 64px;
      height: 64px;
      background: var(--flat-emerald);
      color: var(--flat-white);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
    }
    .bg-emerald-light { background: var(--flat-emerald-light); }
    .bg-amber-light { background: var(--flat-amber-light); }
    .bg-coral-light { background: var(--flat-coral-light); }
    .text-emerald-dark { color: var(--flat-emerald-dark); }
    .text-amber-dark { color: var(--flat-amber-dark); }
    .text-coral-dark { color: var(--flat-coral-dark); }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .max-w-md { max-width: 28rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
  `]
})
export class ExcelImportTabComponent implements OnInit {
  event?: Event;
  step = 1;
  isDragging = false;
  isImporting = false;
  hasSavedMapping = false;
  isAutoMapped = false;

  sheetHeaders: string[] = [];
  rawSheetRows: Record<string, any>[] = [];
  columnMapping!: ColumnMapping;
  validationSummary?: ImportValidationSummary;
  importedCount = 0;
  primaryKeyColumnKey = '';

  // Reorderable mapping row model
  mappingRows: Array<{
    key: string;
    label: string;
    description: string;
    required: boolean;
    selectedHeader: string;
    isCustom?: boolean;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private excelImportService: ExcelImportService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.parent?.snapshot.paramMap.get('id');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.checkSavedMapping(eventId);
    }
  }

  private checkSavedMapping(eventId: string): void {
    const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
    this.hasSavedMapping = !!saved;
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(e: any): void {
    const file = e.target.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  async handleFile(file: File): Promise<void> {
    try {
      const parsed: ParsedSheetData = await this.excelImportService.parseExcelFile(file);
      if (parsed.headers.length === 0 || parsed.rawRows.length === 0) {
        this.toastService.error('Empty File', 'The uploaded Excel file contained no rows.');
        return;
      }

      this.sheetHeaders = parsed.headers;
      this.rawSheetRows = parsed.rawRows;
      this.columnMapping = parsed.detectedMapping;

      this.processSpreadsheetData();
    } catch (err) {
      this.toastService.error('Parse Error', 'Failed to read Excel workbook.');
    }
  }

  loadDemoSpreadsheet(): void {
    const sampleRows = [
      { 'Full Name': 'Victoria Hughes', 'Email Address': 'victoria.hughes@quantum.tech', 'Company': 'Quantum Labs', 'Position': 'VP Engineering', 'Phone': '+1 555-223-4455', 'Dietary': 'Gluten-Free' },
      { 'Full Name': 'Dominic Sterling', 'Email Address': 'dominic.sterling@apexcloud.io', 'Company': 'Apex Cloud', 'Position': 'Solutions Architect', 'Phone': '+1 555-887-1122', 'Dietary': 'None' },
      { 'Full Name': 'Kavita Patel', 'Email Address': 'kavita.patel@synthwave.dev', 'Company': 'Synthwave AI', 'Position': 'Lead Researcher', 'Phone': '+1 555-998-3344', 'Dietary': 'Vegetarian' },
      { 'Full Name': 'Sarah Connor', 'Email Address': 'sarah.connor@cyberdyne.org', 'Company': 'Cyberdyne Systems', 'Position': 'Security Lead', 'Phone': '+1 555-901-2345', 'Dietary': 'Gluten-Free' }, // Duplicate demo
      { 'Full Name': 'Carlos Mendoza', 'Email Address': 'carlos.mendoza@infranet.org', 'Company': 'InfraNet', 'Position': 'Principal SRE', 'Phone': '+1 555-667-8899', 'Dietary': 'Halal' },
      { 'Full Name': 'Zoe Washington', 'Email Address': 'zoe.w@metrolabs.io', 'Company': 'MetroLabs', 'Position': 'Product Manager', 'Phone': '+1 555-334-5566', 'Dietary': 'None' }
    ];

    this.sheetHeaders = Object.keys(sampleRows[0]);
    this.rawSheetRows = sampleRows;
    this.columnMapping = this.excelImportService.autoDetectColumnMapping(this.sheetHeaders);

    this.processSpreadsheetData();
  }

  private processSpreadsheetData(): void {
    const eventId = this.event?.id;
    const savedConfig = eventId ? this.getSavedMappingConfig(eventId) : null;

    if (savedConfig && savedConfig.mappingRows && savedConfig.mappingRows.length > 0) {
      // Re-apply the saved columns from the first import
      this.applySavedMapping(savedConfig);
      this.isAutoMapped = true;
      this.toastService.success('Excel Loaded & Schema Applied', `Applied saved mapping from first Excel. Found ${this.rawSheetRows.length} rows.`);
      this.proceedToPreview(true); // Jump straight to Step 3 Preview
    } else {
      this.buildMappingRows();
      this.isAutoMapped = false;
      this.step = 2;
      this.toastService.success('Spreadsheet Loaded', `Found ${this.rawSheetRows.length} rows and ${this.sheetHeaders.length} columns.`);
    }
  }

  private getSavedMappingConfig(eventId: string): any {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  private applySavedMapping(savedConfig: any): void {
    this.primaryKeyColumnKey = savedConfig.primaryKeyColumnKey || '';
    this.mappingRows = savedConfig.mappingRows.map((r: any) => {
      // Keep mapping if the header exists in the current sheet, or match case-insensitively
      let matchedHeader = '';
      if (r.selectedHeader && this.sheetHeaders.includes(r.selectedHeader)) {
        matchedHeader = r.selectedHeader;
      } else if (r.selectedHeader) {
        const found = this.sheetHeaders.find(h => h.trim().toLowerCase() === r.selectedHeader.trim().toLowerCase());
        if (found) matchedHeader = found;
      }

      return {
        key: r.key,
        label: r.label,
        description: r.description || '',
        required: false,
        selectedHeader: matchedHeader,
        isCustom: !!r.isCustom
      };
    });
  }

  buildMappingRows(): void {
    this.mappingRows = [
      { key: 'firstName', label: 'First Name', description: 'Attendee given name', required: false, selectedHeader: this.columnMapping.firstName || '' },
      { key: 'lastName', label: 'Last Name', description: 'Attendee family name', required: false, selectedHeader: this.columnMapping.lastName || '' },
      { key: 'fullName', label: 'Full Name (Alternative)', description: 'Use if first/last are combined in one column', required: false, selectedHeader: this.columnMapping.fullName || '' },
      { key: 'email', label: 'Email Address', description: 'Attendee email address', required: false, selectedHeader: this.columnMapping.email || '' },
      { key: 'phone', label: 'Mobile / Phone', description: 'Contact telephone', required: false, selectedHeader: this.columnMapping.phone || '' },
      { key: 'company', label: 'Company / Organization', description: 'Organization name', required: false, selectedHeader: this.columnMapping.company || '' },
      { key: 'jobTitle', label: 'Job Title / Role', description: 'Professional designation', required: false, selectedHeader: this.columnMapping.jobTitle || '' },
      { key: 'dietary', label: 'Dietary Preferences', description: 'Meal restrictions / allergies', required: false, selectedHeader: this.columnMapping.dietary || '' }
    ];

    if (this.columnMapping.customColumns && this.columnMapping.customColumns.length > 0) {
      for (const custom of this.columnMapping.customColumns) {
        this.mappingRows.push({
          key: custom.id,
          label: custom.fieldLabel,
          description: 'Custom attendee attribute',
          required: false,
          selectedHeader: custom.sheetHeader,
          isCustom: true
        });
      }
    }
  }

  addCustomColumnMapping(): void {
    const customId = 'custom_' + Math.random().toString(36).substring(2, 9);
    this.mappingRows.unshift({
      key: customId,
      label: 'Column ' + (this.mappingRows.length + 1),
      description: 'Custom field / attribute',
      required: false,
      selectedHeader: '',
      isCustom: true
    });
    this.toastService.info('Column Added', 'Choose a name and select which spreadsheet header to map.');
  }

  removeMappingRow(key: string): void {
    this.mappingRows = this.mappingRows.filter(r => r.key !== key);
    this.toastService.info('Column Removed', 'Removed column from mapping list.');
  }

  clearSavedMappingPreset(): void {
    if (this.event) {
      localStorage.removeItem(`evently_app_mapping_${this.event.id}`);
      this.hasSavedMapping = false;
      this.columnMapping = this.excelImportService.autoDetectColumnMapping(this.sheetHeaders);
      this.buildMappingRows();
      this.toastService.info('Preset Reset', 'Restored default mapping template.');
    }
  }

  moveRowUp(index: number): void {
    if (index > 0) {
      const temp = this.mappingRows[index];
      this.mappingRows[index] = this.mappingRows[index - 1];
      this.mappingRows[index - 1] = temp;
    }
  }

  moveRowDown(index: number): void {
    if (index < this.mappingRows.length - 1) {
      const temp = this.mappingRows[index];
      this.mappingRows[index] = this.mappingRows[index + 1];
      this.mappingRows[index + 1] = temp;
    }
  }

  syncColumnMappingFromRows(): void {
    // Reset standard fields in columnMapping first
    this.columnMapping.firstName = '';
    this.columnMapping.lastName = '';
    this.columnMapping.fullName = '';
    this.columnMapping.email = '';
    this.columnMapping.phone = '';
    this.columnMapping.company = '';
    this.columnMapping.jobTitle = '';
    this.columnMapping.dietary = '';

    const customCols: any[] = [];
    for (const r of this.mappingRows) {
      if (r.isCustom) {
        if (r.selectedHeader) {
          customCols.push({
            id: r.key,
            fieldLabel: r.label,
            sheetHeader: r.selectedHeader
          });
        }
      } else {
        (this.columnMapping as any)[r.key] = r.selectedHeader;
      }
    }
    this.columnMapping.customColumns = customCols;
    this.columnMapping.primaryKeyColumn = this.primaryKeyColumnKey;
  }

  proceedToPreview(isAutomated = false): void {
    if (!this.event) return;

    this.syncColumnMappingFromRows();

    // Check if at least one column is mapped
    const hasAnyMapping = this.mappingRows.some(r => !!r.selectedHeader);
    if (!hasAnyMapping && !isAutomated) {
      this.toastService.warning('No Columns Mapped', 'Please map at least one column to preview your attendee list.');
      return;
    }

    // Persist current column mapping config for future uploads
    this.saveCurrentMappingConfig();

    this.validationSummary = this.excelImportService.validateRows(
      this.rawSheetRows,
      this.columnMapping,
      this.event.id
    );

    this.step = 3;
  }

  private saveCurrentMappingConfig(): void {
    if (!this.event) return;
    const configToSave = {
      primaryKeyColumnKey: this.primaryKeyColumnKey,
      mappingRows: this.mappingRows.map(r => ({
        key: r.key,
        label: r.label,
        description: r.description,
        required: r.required,
        selectedHeader: r.selectedHeader,
        isCustom: r.isCustom
      }))
    };
    localStorage.setItem(`evently_app_mapping_${this.event.id}`, JSON.stringify(configToSave));
    this.hasSavedMapping = true;
  }

  resetForNextImport(): void {
    this.step = 1;
    this.isAutoMapped = false;
    this.rawSheetRows = [];
    this.sheetHeaders = [];
    this.validationSummary = undefined;
    if (this.event) {
      this.checkSavedMapping(this.event.id);
    }
  }

  hasColumnValue(key: string): boolean {
    if (!this.validationSummary || !this.validationSummary.rows.length) return false;
    
    // Check if the column is explicitly mapped to a header
    const mappingRow = this.mappingRows.find(r => r.key === key);
    if (!mappingRow || !mappingRow.selectedHeader) return false;

    // Check if any row actually has a non-empty value for this key
    return this.validationSummary.rows.some(row => {
      if (key === 'email') return !!row.email;
      if (key === 'company') return !!row.company;
      if (key === 'jobTitle') return !!row.jobTitle;
      if (key === 'phone') return !!row.phone;
      if (key === 'dietary') return !!row.dietaryPreferences;
      return false;
    });
  }

  getColumnLabel(key: string, fallback: string): string {
    const mappingRow = this.mappingRows.find(r => r.key === key);
    return mappingRow?.label || fallback;
  }

  getActiveCustomColumns(): Array<{ id: string; fieldLabel: string; sheetHeader: string }> {
    if (!this.columnMapping?.customColumns || !this.validationSummary?.rows?.length) return [];
    
    // Only return custom columns that have non-empty answers in at least one row
    return this.columnMapping.customColumns.filter(cCol => {
      return this.validationSummary!.rows.some(row => {
        const val = this.getCustomAnswerValue(row, cCol.id);
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
    });
  }

  getCustomAnswerValue(row: any, questionId: string): string {
    if (!row.customAnswers || !row.customAnswers.length) return '';
    const found = row.customAnswers.find((ca: any) => ca.questionId === questionId);
    return found ? String(found.answer) : '';
  }

  hasAnyMappedColumnsExceptName(): boolean {
    return this.hasColumnValue('email') ||
           this.hasColumnValue('company') ||
           this.hasColumnValue('jobTitle') ||
           this.hasColumnValue('phone') ||
           this.hasColumnValue('dietary') ||
           this.getActiveCustomColumns().length > 0;
  }

  getImportableCount(): number {
    if (!this.validationSummary) return 0;
    return this.validationSummary.rows.filter(r => {
      if (!r.isValid) return false;
      if (r.isDuplicate && r.duplicateResolution === 'skip') return false;
      return true;
    }).length;
  }

  confirmImport(): void {
    if (!this.event || !this.validationSummary) return;

    const importable = this.validationSummary.rows.filter(r => {
      if (!r.isValid) return false;
      if (r.isDuplicate && r.duplicateResolution === 'skip') return false;
      return true;
    });

    if (importable.length === 0) {
      this.toastService.warning('No Records', 'No valid rows selected for import.');
      return;
    }

    this.isImporting = true;

    setTimeout(() => {
      const attendeesToCreate = importable.map(r => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        company: r.company,
        jobTitle: r.jobTitle,
        dietaryPreferences: r.dietaryPreferences,
        rsvpStatus: r.rsvpStatus || 'pending',
        customAnswers: r.customAnswers || []
      }));

      const created = this.registrationService.importBatchAttendees(this.event!.id, attendeesToCreate);
      this.importedCount = created.length;
      this.isImporting = false;
      this.step = 4;
      this.toastService.success('Import Successful', `Imported ${created.length} attendees with QR passes.`);
    }, 400);
  }

  downloadSampleTemplate(): void {
    const sampleData = [
      {
        'First Name': 'Alex',
        'Last Name': 'Johnson',
        'Email Address': 'alex.j@example.com',
        'Phone Number': '+1 555-0199',
        'Company': 'Acme Corp',
        'Job Title': 'Senior Engineer',
        'RSVP Status': 'Attending',
        'Dietary': 'Vegetarian'
      },
      {
        'First Name': 'Sam',
        'Last Name': 'Taylor',
        'Email Address': 'sam.t@example.com',
        'Phone Number': '+1 555-0144',
        'Company': 'TechForward',
        'Job Title': 'Product Designer',
        'RSVP Status': 'Attending',
        'Dietary': 'None'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'evently_attendee_import_template.xlsx');
    this.toastService.info('Downloaded', 'Sample Excel template downloaded.');
  }
}
