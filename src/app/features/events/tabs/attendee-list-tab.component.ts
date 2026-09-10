import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ExcelImportService } from '../../../core/services/excel-import.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, Registration, RSVPStatus, RegistrationType, RegistrationSource } from '../../../core/models/event.model';
import { RsvpBadgeComponent } from '../../../shared/components/rsvp-badge/rsvp-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';

@Component({
  selector: 'app-attendee-list-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RsvpBadgeComponent, StatusBadgeComponent, ModalComponent, QrDisplayComponent],
  template: `
    <div class="attendees-tab-wrapper" *ngIf="event">
      
      <!-- Top Action & Filter Toolbar -->
      <div class="attendees-toolbar flat-card mb-4">
        <div class="toolbar-top flex justify-between items-center flex-wrap gap-3">
          <div class="search-box flex-1">
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="searchQuery" 
              placeholder="Search by attendee name, email, company, or Reg ID..." 
            />
          </div>

          <div class="flex gap-2 flex-wrap items-center">
            <button (click)="cleanDuplicates()" class="btn btn-coral btn-sm" title="Find and purge redundant duplicate entries by ID, email, or name">
              🧹 Clean Duplicates
            </button>
            <a [routerLink]="['/event', event.id, 'rsvp']" target="_blank" class="btn btn-primary btn-sm">
              🔗 Open Guest RSVP Portal
            </a>
            <button (click)="exportExcel()" class="btn btn-emerald btn-sm">
              📊 Export to Excel (.xlsx)
            </button>
            <a [routerLink]="['/events', event.id, 'import']" class="btn btn-secondary btn-sm">
              📁 Import Excel
            </a>
          </div>
        </div>

        <!-- Filter Dropdowns Row -->
        <div class="toolbar-filters grid gap-3 mt-3" [class.grid-cols-4]="configColumns.length === 0" [class.grid-cols-5]="configColumns.length > 0">
          <div>
            <label class="filter-label">Registration Source</label>
            <select class="form-control text-xs" [(ngModel)]="filterSource">
              <option value="all">All Sources</option>
              <option value="form">Online Form RSVP</option>
              <option value="excel-import">Excel Import</option>
              <option value="walk-in">Walk-In Registration</option>
            </select>
          </div>

          <div>
            <label class="filter-label">Check-In Status</label>
            <select class="form-control text-xs" [(ngModel)]="filterCheckIn">
              <option value="all">All Attendees</option>
              <option value="checked-in">Checked In Only</option>
              <option value="not-checked-in">Not Checked In</option>
            </select>
          </div>

          <div>
            <label class="filter-label">RSVP Response</label>
            <select class="form-control text-xs" [(ngModel)]="filterRsvp">
              <option value="all">All Responses</option>
              <option value="attending">Attending</option>
              <option value="maybe">Maybe</option>
              <option value="declined">Declined</option>
              <option value="pending">Invited / Pending</option>
            </select>
          </div>

          <div>
            <label class="filter-label">Sort Order</label>
            <select class="form-control text-xs" [(ngModel)]="sortBy">
              <option value="newest">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="checkin-time">Check-In Time</option>
            </select>
          </div>

          <!-- QR Email Column selector: shown only when config columns exist -->
          <div *ngIf="configColumns.length > 0">
            <label class="filter-label">📧 Send QR Via Column</label>
            <div class="flex gap-1 items-center">
              <select class="form-control text-xs flex-1" [(ngModel)]="qrEmailColumnKey" (ngModelChange)="qrEmailColumnSaved = false">
                <option value="">— Select email column —</option>
                <option *ngFor="let col of configColumns" [value]="col.key">{{ col.label }}</option>
              </select>
              <button
                class="btn btn-primary btn-sm"
                style="white-space:nowrap"
                (click)="saveQrEmailColumn()"
                [disabled]="!qrEmailColumnKey"
              >Save</button>
            </div>
            <span *ngIf="qrEmailColumnSaved" class="text-xs text-emerald mt-1 block">✓ Saved</span>
          </div>
        </div>
      </div>

      <!-- Attendees Table -->
      <div class="flat-table-container">
        <table class="flat-table">
          <thead>
            <tr>
              <!-- Show static Guest Name only when no config columns are present -->
              <th *ngIf="configColumns.length === 0">Guest Name</th>
              <th>Registration ID</th>
              <th *ngFor="let col of configColumns" class="config-col-header">{{ col.label }}</th>
              <th>RSVP</th>
              <th>Type / Source</th>
              <th>Check-In Status</th>
              <th>Registered</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let reg of filteredAttendees">
              <!-- Static Guest Name cell only when no config columns -->
              <td *ngIf="configColumns.length === 0">
                <div class="guest-cell">
                  <strong class="guest-name">{{ reg.firstName }} {{ reg.lastName }}</strong>
                  <span class="guest-email font-mono">{{ reg.email }}</span>
                  <span class="guest-role text-xs text-muted" *ngIf="reg.company || reg.jobTitle">
                    {{ reg.jobTitle || 'Role' }} • {{ reg.company || 'Company' }}
                  </span>
                </div>
              </td>

              <td>
                <span class="reg-pill font-mono">{{ reg.id }}</span>
              </td>

              <!-- Dynamic config columns -->
              <td *ngFor="let col of configColumns" class="config-col-cell">
                <span *ngIf="getColumnValue(reg, col) as val">{{ val }}</span>
                <span *ngIf="!getColumnValue(reg, col)" class="text-muted text-xs">—</span>
              </td>

              <td>
                <app-rsvp-badge [status]="reg.rsvpStatus"></app-rsvp-badge>
              </td>

              <td>
                <app-status-badge [source]="reg.registrationSource"></app-status-badge>
              </td>

              <td>
                <div class="checkin-cell">
                  <app-status-badge [checkedIn]="reg.checkInStatus"></app-status-badge>
                  <span *ngIf="reg.checkInStatus && reg.checkInTime" class="text-2xs font-mono text-emerald mt-1">
                    {{ formatDateTime(reg.checkInTime) }}
                  </span>
                </div>
              </td>

              <td class="text-xs text-muted">
                {{ formatDate(reg.registrationDate) }}
              </td>

              <td class="text-right">
                <div class="actions-cell flex justify-end gap-1">
                  <!-- Quick Toggle Check-in -->
                  <button
                    *ngIf="!reg.checkInStatus"
                    (click)="toggleCheckIn(reg)"
                    class="btn-icon btn-icon-emerald"
                    title="Check In"
                  >
                    ✓
                  </button>
                  <button
                    *ngIf="reg.checkInStatus"
                    (click)="toggleCheckIn(reg)"
                    class="btn-icon btn-icon-dark"
                    title="Undo Check-In"
                  >
                    ↩
                  </button>

                  <button (click)="openPassModal(reg)" class="btn-icon" title="View Digital QR Pass">
                    🎟
                  </button>

                  <!-- Send QR Pass via email: shown only when an email column is selected -->
                  <button
                    *ngIf="qrEmailColumnKey"
                    (click)="sendQrPass(reg)"
                    class="btn-icon btn-icon-primary"
                    [title]="'Send QR Pass to ' + getQrEmail(reg)"
                  >
                    📧
                  </button>

                  <button (click)="openEditModal(reg)" class="btn-icon" title="Edit Attendee Details">
                    ✏️
                  </button>

                  <button (click)="deleteAttendee(reg)" class="btn-icon btn-icon-coral" title="Delete Registration">
                    🗑
                  </button>
                </div>
              </td>
            </tr>

            <!-- Case 1: Genuinely empty — no registrations at all -->
            <tr *ngIf="filteredAttendees.length === 0 && attendees.length === 0">
              <td [attr.colspan]="(configColumns.length > 0 ? 6 : 7) + configColumns.length">
                <div class="empty-attendees-prompt">
                  <div class="empty-prompt-icon">👥</div>
                  <h3 class="empty-prompt-title">No attendees are currently registered for this event.</h3>
                  <p class="empty-prompt-sub" *ngIf="emptyAction === 'idle'">Are all attendees expected to be walk-ins?</p>

                  <!-- Initial question buttons -->
                  <div class="empty-prompt-actions" *ngIf="emptyAction === 'idle'">
                    <a
                      [routerLink]="['/event', event!.id, 'rsvp']"
                      target="_blank"
                      class="btn btn-primary"
                      (click)="emptyAction = 'walkin'"
                    >
                      ✅ Yes, all are walk-ins
                    </a>
                    <button type="button" class="btn btn-secondary" (click)="emptyAction = 'add'">
                      📋 No, I need to add attendees
                    </button>
                  </div>

                  <!-- Add attendees options -->
                  <div *ngIf="emptyAction === 'add'" class="empty-prompt-add">
                    <p class="empty-prompt-sub">Choose how you'd like to add attendees:</p>
                    <div class="empty-prompt-actions">
                      <a [routerLink]="['/events', event!.id, 'import']" class="btn btn-primary">
                        📁 Import from Excel
                      </a>
                      <a [routerLink]="['/event', event!.id, 'register']" target="_blank" class="btn btn-secondary">
                        ✍️ Register Attendee Manually
                      </a>
                    </div>
                    <button type="button" class="btn-text-link mt-3" (click)="emptyAction = 'idle'">← Back</button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Case 2: Attendees exist but filters/search hides them -->
            <tr *ngIf="filteredAttendees.length === 0 && attendees.length > 0">
              <td [attr.colspan]="(configColumns.length > 0 ? 6 : 7) + configColumns.length" class="text-center py-8 text-muted">
                No attendees match the current filters or search criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail & QR Pass Modal -->
      <app-modal 
        [isOpen]="isPassModalOpen" 
        [title]="selectedReg ? selectedReg.firstName + ' ' + selectedReg.lastName + ' — Pass' : 'Attendee Pass'"
        maxWidth="500px"
        (close)="isPassModalOpen = false"
      >
        <div *ngIf="selectedReg" class="pass-modal-body text-center">
          <div class="mb-3">
            <span class="font-mono text-xs text-primary font-bold">{{ selectedReg.id }}</span>
            <h3 class="text-xl font-extrabold text-dark mt-1">{{ selectedReg.firstName }} {{ selectedReg.lastName }}</h3>
            <p class="text-xs text-muted">{{ selectedReg.email }}</p>
          </div>

          <div class="flex justify-center gap-2 mb-4">
            <app-rsvp-badge [status]="selectedReg.rsvpStatus"></app-rsvp-badge>
            <app-status-badge [checkedIn]="selectedReg.checkInStatus"></app-status-badge>
          </div>

          <app-qr-display 
            [token]="selectedReg.qrToken" 
            [guestName]="selectedReg.firstName + ' ' + selectedReg.lastName"
            [regId]="selectedReg.id"
            [showActions]="true"
          ></app-qr-display>
        </div>
      </app-modal>

      <!-- Edit Attendee Modal -->
      <app-modal 
        [isOpen]="isEditModalOpen" 
        title="Edit Attendee Details" 
        (close)="isEditModalOpen = false"
      >
        <div *ngIf="editTargetReg" class="edit-form-body">
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label text-xs">First Name</label>
              <input type="text" class="form-control text-xs" [(ngModel)]="editTargetReg.firstName" />
            </div>
            <div class="form-group">
              <label class="form-label text-xs">Last Name</label>
              <input type="text" class="form-control text-xs" [(ngModel)]="editTargetReg.lastName" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-xs">Email Address</label>
            <input type="email" class="form-control text-xs" [(ngModel)]="editTargetReg.email" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label text-xs">Company</label>
              <input type="text" class="form-control text-xs" [(ngModel)]="editTargetReg.company" />
            </div>
            <div class="form-group">
              <label class="form-label text-xs">Job Title</label>
              <input type="text" class="form-control text-xs" [(ngModel)]="editTargetReg.jobTitle" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label text-xs">Dietary Preferences</label>
            <input type="text" class="form-control text-xs" [(ngModel)]="editTargetReg.dietaryPreferences" />
          </div>
        </div>

        <div modal-footer>
          <button (click)="isEditModalOpen = false" class="btn btn-secondary btn-sm">Cancel</button>
          <button (click)="saveEditedAttendee()" class="btn btn-primary btn-sm">Save Changes</button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .attendees-tab-wrapper {
      display: flex;
      flex-direction: column;
    }
    .attendees-toolbar {
      background: var(--flat-white);
    }
    .search-box {
      min-width: 280px;
    }
    .filter-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--flat-gray-500);
      text-transform: uppercase;
      margin-bottom: 0.2rem;
    }
    .guest-cell {
      display: flex;
      flex-direction: column;
    }
    .guest-name {
      color: var(--flat-dark);
      font-size: 0.9rem;
    }
    .guest-email {
      font-size: 0.75rem;
      color: var(--flat-gray-500);
    }
    .reg-pill {
      font-size: 0.75rem;
      background: var(--flat-gray-100);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--flat-primary-dark);
      font-weight: 700;
    }
    .checkin-cell {
      display: flex;
      flex-direction: column;
    }
    .text-2xs { font-size: 0.65rem; }
    .btn-icon {
      background: var(--flat-gray-100);
      border: 1px solid var(--flat-border);
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .btn-icon:hover {
      background: var(--flat-gray-200);
    }
    .btn-icon-emerald {
      background: var(--flat-emerald-light);
      color: var(--flat-emerald-dark);
      border-color: var(--flat-emerald);
      font-weight: 800;
    }
    .btn-icon-coral {
      background: var(--flat-coral-light);
      color: var(--flat-coral-dark);
      border-color: var(--flat-coral);
    }
    .btn-icon-dark {
      background: var(--flat-gray-800);
      color: var(--flat-white);
      border-color: var(--flat-gray-700);
    }
    .config-col-header {
      white-space: nowrap;
    }
    .config-col-cell {
      font-size: 0.82rem;
      color: var(--flat-dark);
      max-width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-icon-primary {
      background: var(--flat-primary-light);
      color: var(--flat-primary-dark);
      border-color: var(--flat-primary);
    }
    .py-8 { padding: 2rem 0; }
    .empty-attendees-prompt {
      padding: 2.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
    }
    .empty-prompt-icon {
      font-size: 2.5rem;
      line-height: 1;
      margin-bottom: 0.25rem;
    }
    .empty-prompt-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0;
    }
    .empty-prompt-sub {
      font-size: 0.875rem;
      color: var(--flat-gray-600);
      margin: 0;
    }
    .empty-prompt-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 0.5rem;
    }
    .empty-prompt-add {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-text-link {
      background: none;
      border: none;
      color: var(--flat-primary);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .btn-text-link:hover { opacity: 0.75; }
    .mt-3 { margin-top: 0.75rem; }
  `]
})
export class AttendeeListTabComponent implements OnInit, OnDestroy {
  event?: Event;
  attendees: Registration[] = [];
  private regSub?: Subscription;
  private pollInterval?: ReturnType<typeof setInterval>;
  private onStorageChange = (e: StorageEvent) => {
    if (!e.key || e.key === 'evently_app_registrations') {
      this.zone.run(() => this.registrationService.refreshFromStorage());
    }
  };
  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.zone.run(() => this.registrationService.refreshFromStorage());
    }
  };
  private onWindowFocus = () => this.zone.run(() => this.registrationService.refreshFromStorage());

  /** Tracks which empty-state panel is shown: idle = question, add = add-options, walkin = navigated away */
  emptyAction: 'idle' | 'add' | 'walkin' = 'idle';

  searchQuery = '';
  filterSource: 'all' | RegistrationSource = 'all';
  filterCheckIn: 'all' | 'checked-in' | 'not-checked-in' = 'all';
  filterRsvp: 'all' | RSVPStatus = 'all';
  sortBy = 'newest';

  /** Columns derived from the saved Excel mapping config for this event */
  configColumns: Array<{ key: string; label: string; isCustom: boolean }> = [];

  /** Key of the column whose value should be used as the recipient email for QR pass delivery */
  qrEmailColumnKey = '';
  qrEmailColumnSaved = false;

  isPassModalOpen = false;
  selectedReg: Registration | null = null;

  isEditModalOpen = false;
  editTargetReg: Registration | null = null;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private checkInService: CheckInService,
    private excelImportService: ExcelImportService,
    private toastService: ToastService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const eventId = this.route.parent?.snapshot.paramMap.get('id');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.loadConfigColumns(eventId);
      // Seed fresh from localStorage immediately
      this.registrationService.refreshFromStorage();
      // Subscribe — receives current value immediately and any future pushes
      this.regSub = this.registrationService.registrations$.subscribe(all => {
        this.attendees = all.filter(r => r.eventId === eventId);
      });
      // Cross-tab: storage event fires when another tab writes to localStorage
      window.addEventListener('storage', this.onStorageChange);
      // Same-tab focus return (visibilitychange + focus for max compatibility)
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.addEventListener('focus', this.onWindowFocus);
      // Polling fallback every 2 s — run inside zone so change detection fires
      this.pollInterval = setInterval(
        () => this.zone.run(() => this.registrationService.refreshFromStorage()), 2000
      );
    }
  }

  ngOnDestroy(): void {
    this.regSub?.unsubscribe();
    clearInterval(this.pollInterval);
    window.removeEventListener('storage', this.onStorageChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('focus', this.onWindowFocus);
  }

  private loadConfigColumns(eventId: string): void {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.mappingRows)) return;
      this.configColumns = parsed.mappingRows
        .filter((r: any) => r.selectedHeader && r.selectedHeader.trim())
        .map((r: any) => ({ key: r.key, label: r.label, isCustom: !!r.isCustom }));
      // Restore previously saved QR email column choice
      if (parsed.qrEmailColumnKey) {
        this.qrEmailColumnKey = parsed.qrEmailColumnKey;
        this.qrEmailColumnSaved = true;
      }
    } catch {
      this.configColumns = [];
    }
  }

  saveQrEmailColumn(): void {
    if (!this.event || !this.qrEmailColumnKey) return;
    try {
      const raw = localStorage.getItem(`evently_app_mapping_${this.event.id}`);
      const config = raw ? JSON.parse(raw) : {};
      config.qrEmailColumnKey = this.qrEmailColumnKey;
      localStorage.setItem(`evently_app_mapping_${this.event.id}`, JSON.stringify(config));
      this.qrEmailColumnSaved = true;
      this.toastService.success('Saved', 'QR email column preference saved.');
    } catch {
      this.toastService.error('Error', 'Could not save preference.');
    }
  }

  /** Get a cell value for a registration given a column key */
  getColumnValue(reg: Registration, col: { key: string; isCustom: boolean; label?: string }): string {
    // 1. Try customAnswers lookup by questionId (covers Excel-imported rows)
    const byId = reg.customAnswers?.find(a => a.questionId === col.key);
    if (byId) return String(byId.answer ?? '');

    // 2. Try standard field by key (covers form-registered rows and standard mapped columns)
    const std = this.resolveStandardField(reg, col.key);
    if (std) return std;

    // 3. Fuzzy fallback: match customAnswers by questionText ~ label (handles renamed columns)
    if (col.label) {
      const labelLower = col.label.toLowerCase();
      const byText = reg.customAnswers?.find(a =>
        (a.questionText || '').toLowerCase() === labelLower
      );
      if (byText) return String(byText.answer ?? '');
    }

    return '';
  }

  private resolveStandardField(reg: Registration, key: string): string {
    switch (key) {
      case 'firstName':  return reg.firstName || '';
      case 'lastName':   return reg.lastName || '';
      case 'fullName':   return `${reg.firstName} ${reg.lastName}`.trim();
      case 'email':      return reg.email || '';
      case 'phone':      return reg.phone || '';
      case 'company':    return reg.company || '';
      case 'jobTitle':   return reg.jobTitle || '';
      case 'dietary':    return reg.dietaryPreferences || '';
      default:           return '';
    }
  }

  /** Resolve the email address for QR delivery from the selected column */
  getQrEmail(reg: Registration): string {
    if (!this.qrEmailColumnKey) return '';
    const col = this.configColumns.find(c => c.key === this.qrEmailColumnKey);
    if (!col) return '';
    return this.getColumnValue(reg, col);
  }

  /** Open a mailto: link to send the QR pass confirmation to the attendee */
  sendQrPass(reg: Registration): void {
    if (!this.event) return;
    const email = this.getQrEmail(reg);
    if (!email) {
      this.toastService.warning('No Email', 'This attendee has no value in the selected email column.');
      return;
    }
    const colLabel = this.configColumns.find(c => c.key === this.qrEmailColumnKey)?.label || 'Email';
    const confirmUrl = `${window.location.origin}/event/${this.event.id}/confirmation/${reg.id}`;
    const subject = encodeURIComponent(`Your QR Pass — ${this.event.name}`);
    const body = encodeURIComponent(
      `Hi,\n\nHere is your QR Check-In Pass for ${this.event.name}.\n\nView & download your pass here:\n${confirmUrl}\n\nRegistration ID: ${reg.id}\n\nSee you there!`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  }

  loadAttendees(eventId: string): void {
    // Refresh through the BehaviorSubject so the subscription picks it up
    this.registrationService.refreshFromStorage();
  }

  get filteredAttendees(): Registration[] {
    return this.attendees.filter(r => {
      // Search
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const email = r.email.toLowerCase();
        const id = r.id.toLowerCase();
        const comp = (r.company || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !id.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      // Source
      if (this.filterSource !== 'all' && r.registrationSource !== this.filterSource) {
        return false;
      }

      // Check In
      if (this.filterCheckIn === 'checked-in' && !r.checkInStatus) return false;
      if (this.filterCheckIn === 'not-checked-in' && r.checkInStatus) return false;

      // RSVP
      if (this.filterRsvp !== 'all' && r.rsvpStatus !== this.filterRsvp) return false;

      return true;
    }).sort((a, b) => {
      if (this.sortBy === 'name') {
        return a.firstName.localeCompare(b.firstName);
      }
      if (this.sortBy === 'checkin-time') {
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        return timeB - timeA;
      }
      // newest
      return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
    });
  }

  toggleCheckIn(reg: Registration): void {
    if (!this.event) return;
    if (reg.checkInStatus) {
      this.checkInService.undoCheckIn(reg.id);
      this.toastService.info('Check-In Reverted', `${reg.firstName} status reset.`);
    } else {
      this.checkInService.verifyAndCheckIn(reg.id, this.event.id);
      this.toastService.success('Checked In', `${reg.firstName} checked in.`);
    }
    this.loadAttendees(this.event.id);
  }

  openPassModal(reg: Registration): void {
    this.selectedReg = reg;
    this.isPassModalOpen = true;
  }

  openEditModal(reg: Registration): void {
    this.editTargetReg = { ...reg };
    this.isEditModalOpen = true;
  }

  saveEditedAttendee(): void {
    if (!this.editTargetReg || !this.event) return;
    this.registrationService.updateRegistration(this.editTargetReg.id, this.editTargetReg);
    this.isEditModalOpen = false;
    this.toastService.success('Attendee Saved', 'Attendee record updated.');
    this.loadAttendees(this.event.id);
  }

  deleteAttendee(reg: Registration): void {
    if (!this.event) return;
    if (confirm(`Remove registration for ${reg.firstName} ${reg.lastName}?`)) {
      this.registrationService.deleteRegistration(reg.id);
      this.toastService.warning('Attendee Removed', 'Registration removed from event.');
      this.loadAttendees(this.event.id);
    }
  }

  cleanDuplicates(): void {
    if (!this.event) return;
    const all = this.registrationService.getRegistrationsForEvent(this.event.id);
    if (!all.length) {
      this.toastService.info('No Attendees', 'No attendee records in this event.');
      return;
    }

    const seenKeys = new Set<string>();
    const toDeleteIds: string[] = [];

    // Helper to get attendee key (custom ID, email, or full name)
    for (const reg of all) {
      let uniqueKey = '';

      // Check if custom ID answers exist
      if (reg.customAnswers && reg.customAnswers.length) {
        for (const ca of reg.customAnswers) {
          if (ca.answer && String(ca.answer).trim()) {
            uniqueKey = 'id:' + String(ca.answer).trim().toLowerCase();
            break;
          }
        }
      }

      if (!uniqueKey && reg.email && reg.email.trim()) {
        uniqueKey = 'email:' + reg.email.trim().toLowerCase();
      }

      if (!uniqueKey && (reg.firstName || reg.lastName)) {
        uniqueKey = 'name:' + `${reg.firstName} ${reg.lastName}`.trim().toLowerCase();
      }

      if (uniqueKey) {
        if (seenKeys.has(uniqueKey)) {
          toDeleteIds.push(reg.id);
        } else {
          seenKeys.add(uniqueKey);
        }
      }
    }

    if (toDeleteIds.length === 0) {
      this.toastService.info('No Duplicates', 'All attendee records are already unique!');
      return;
    }

    if (confirm(`Found ${toDeleteIds.length} duplicate attendee record(s). Do you want to remove them and keep only 1 copy per attendee?`)) {
      for (const id of toDeleteIds) {
        this.registrationService.deleteRegistration(id);
      }
      this.toastService.success('Duplicates Cleaned', `Removed ${toDeleteIds.length} duplicate record(s).`);
      this.loadAttendees(this.event.id);
    }
  }

  exportExcel(): void {
    if (!this.event) return;
    this.excelImportService.exportRegistrationsToExcel(this.filteredAttendees, this.event.name);
    this.toastService.success('Excel Exported', 'Downloaded attendee spreadsheet.');
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString();
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}
