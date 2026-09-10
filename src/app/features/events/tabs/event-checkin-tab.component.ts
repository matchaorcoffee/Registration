import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { CheckInService, CheckInVerificationResult } from '../../../core/services/checkin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Event, Registration, CustomQuestion } from '../../../core/models/event.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { QrDisplayComponent } from '../../../shared/components/qr-display/qr-display.component';

@Component({
  selector: 'app-event-checkin-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ModalComponent, QrDisplayComponent],
  template: `
    <div class="checkin-terminal-wrapper" *ngIf="event">
      
      <!-- Top Event Day Status Bar -->
      <div class="terminal-banner flat-card mb-4">
        <div class="flex justify-between items-center flex-wrap gap-3">
          <div>
            <span class="banner-badge">LIVE CHECK-IN STATION</span>
            <h2 class="banner-event-name">{{ event.name }}</h2>
            <p class="text-xs text-muted">📍 {{ event.venue }} • Desk Operator: <strong>Staff Alex</strong></p>
          </div>

          <!-- Attendance Counter -->
          <div class="attendance-metric-capsule">
            <div class="metric-block">
              <span class="m-label">Checked In</span>
              <span class="m-val text-emerald">{{ checkedInCount }}</span>
            </div>
            <div class="capsule-sep">/</div>
            <div class="metric-block">
              <span class="m-label">Total RSVP</span>
              <span class="m-val">{{ totalRegistrations }}</span>
            </div>
            <div class="metric-block badge-rate">
              <span class="m-label">Rate</span>
              <span class="m-rate font-mono">{{ attendancePercent }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PRIMARY ZERO-FRICTION ACTION TOGGLE (Mobile & Tablet First) -->
      <div class="primary-action-grid mb-6">
        <button 
          (click)="activeMode = 'scan'" 
          class="action-btn scan-btn"
          [class.active]="activeMode === 'scan'"
        >
          <div class="action-btn-icon">📷</div>
          <div class="action-btn-text">
            <strong>SCAN QR PASS</strong>
            <span>Device camera or token scanner</span>
          </div>
        </button>

        <button 
          (click)="openWalkInModal()" 
          class="action-btn walkin-btn"
          [class.active]="activeMode === 'walkin'"
        >
          <div class="action-btn-icon">⚡</div>
          <div class="action-btn-text">
            <strong>+ WALK-IN GUEST</strong>
            <span>Quick register & auto check-in</span>
          </div>
        </button>

        <button 
          (click)="activeMode = 'manual'" 
          class="action-btn manual-btn"
          [class.active]="activeMode === 'manual'"
        >
          <div class="action-btn-icon">🔍</div>
          <div class="action-btn-text">
            <strong>MANUAL SEARCH</strong>
            <span>Name, Email, or ID lookup</span>
          </div>
        </button>
      </div>

      <!-- MODE 1: QR SCANNER SECTION -->
      <div *ngIf="activeMode === 'scan'" class="scanner-section">
        <div class="grid grid-cols-2 gap-6">
          
          <!-- Scanner Camera / Input Box -->
          <div class="flat-card scanner-card">
            <h3 class="card-heading mb-3">QR Scanner Viewfinder</h3>
            
            <div class="viewfinder-box">
              <div class="viewfinder-laser"></div>
              <div class="viewfinder-corners">
                <span class="corner tl"></span>
                <span class="corner tr"></span>
                <span class="corner bl"></span>
                <span class="corner br"></span>
              </div>
              <div class="viewfinder-prompt">
                <span class="text-xs font-bold text-white uppercase tracking-wider">Position QR Pass within frame</span>
              </div>
            </div>

            <!-- Fast Quick Token Input (for Barcode / 2D Scanners or manual test) -->
            <form (ngSubmit)="handleScanInput(scanInputValue)" class="scan-input-form mt-4">
              <div class="form-group mb-0 flex-1">
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="scanInputValue" 
                  name="scanInputValue"
                  placeholder="Paste QR Token / Reg ID (e.g. tok_... or EVT-...)" 
                  autofocus
                />
              </div>
              <button type="submit" [disabled]="!scanInputValue.trim()" class="btn btn-primary">
                Verify
              </button>
            </form>

            <!-- Test Simulator Shortcuts -->
            <div class="quick-sim-box mt-3">
              <span class="text-xs font-bold text-gray-500">Quick Test Registered Guests:</span>
              <div class="sim-pill-list">
                <button 
                  *ngFor="let r of demoScanTargets" 
                  type="button" 
                  (click)="handleScanInput(r.qrToken)"
                  class="sim-pill"
                >
                  {{ r.firstName }} {{ r.lastName }} ({{ r.checkInStatus ? 'Already In' : 'Not In' }})
                </button>
                <button 
                  type="button" 
                  (click)="handleScanInput('tok_invalid_random_xyz999')" 
                  class="sim-pill pill-coral"
                >
                  Invalid Token
                </button>
              </div>
            </div>
          </div>

          <!-- Scan Feedback Panel (Green / Amber / Red Result Card) -->
          <div class="feedback-panel">
            <!-- State: Empty / Waiting -->
            <div *ngIf="!lastScanResult" class="flat-card waiting-card">
              <div class="waiting-icon">📡</div>
              <h4 class="font-bold text-dark">Scanner Ready</h4>
              <p class="text-sm text-muted">Awaiting attendee QR code presentation or manual code entry.</p>
            </div>

            <!-- State 1: SUCCESSFUL CHECK-IN (Green) -->
            <div *ngIf="lastScanResult?.status === 'success'" class="flat-card result-card result-success">
              <div class="result-header">
                <div class="result-icon-badge icon-success">✓</div>
                <div>
                  <span class="res-tag">CHECK-IN SUCCESSFUL</span>
                  <h3 class="res-guest-name">
                    {{ lastScanResult?.registration?.firstName }} {{ lastScanResult?.registration?.lastName }}
                  </h3>
                </div>
              </div>

              <div class="result-details-grid">
                <div class="res-item">
                  <span class="res-label">Registration ID</span>
                  <strong class="font-mono text-primary">{{ lastScanResult?.registration?.id }}</strong>
                </div>
                <div class="res-item">
                  <span class="res-label">RSVP Status</span>
                  <strong>{{ lastScanResult?.registration?.rsvpStatus | uppercase }}</strong>
                </div>
                <div class="res-item">
                  <span class="res-label">Entry Channel</span>
                  <span>{{ lastScanResult?.registration?.registrationSource | titlecase }}</span>
                </div>
                <div class="res-item">
                  <span class="res-label">Check-In Time</span>
                  <span class="font-mono text-emerald-dark font-bold">
                    {{ formatTime(lastScanResult?.checkedInAt) }}
                  </span>
                </div>
              </div>

              <div class="result-actions mt-4 flex gap-2">
                <button (click)="undoScan(lastScanResult?.registration?.id!)" class="btn btn-sm btn-outline-dark">
                  Undo Check-In
                </button>
                <button (click)="lastScanResult = null" class="btn btn-sm btn-primary">
                  Next Guest →
                </button>
              </div>
            </div>

            <!-- State 2: ALREADY CHECKED IN (Amber Warning) -->
            <div *ngIf="lastScanResult?.status === 'already-checked-in'" class="flat-card result-card result-warning">
              <div class="result-header">
                <div class="result-icon-badge icon-warning">⚠</div>
                <div>
                  <span class="res-tag text-amber-dark">ALREADY CHECKED IN</span>
                  <h3 class="res-guest-name">
                    {{ lastScanResult?.registration?.firstName }} {{ lastScanResult?.registration?.lastName }}
                  </h3>
                </div>
              </div>

              <div class="result-warning-message">
                <strong>Attention:</strong> This QR code pass has already been used to enter the event today.
              </div>

              <div class="result-details-grid">
                <div class="res-item">
                  <span class="res-label">Registration ID</span>
                  <strong class="font-mono">{{ lastScanResult?.registration?.id }}</strong>
                </div>
                <div class="res-item">
                  <span class="res-label">Original Check-In Time</span>
                  <strong class="text-amber-dark font-mono">
                    {{ formatDateTime(lastScanResult?.previousCheckInTime) }}
                  </strong>
                </div>
              </div>

              <div class="result-actions mt-4">
                <button (click)="lastScanResult = null" class="btn btn-sm btn-secondary btn-block">
                  Acknowledge & Clear
                </button>
              </div>
            </div>

            <!-- State 3: INVALID / NOT RECOGNIZED (Red) -->
            <div *ngIf="lastScanResult?.status === 'not-found' || lastScanResult?.status === 'invalid-event'" class="flat-card result-card result-danger">
              <div class="result-header">
                <div class="result-icon-badge icon-danger">✕</div>
                <div>
                  <span class="res-tag text-coral-dark">INVALID REGISTRATION</span>
                  <h3 class="res-guest-name">Pass Rejected</h3>
                </div>
              </div>

              <div class="result-danger-message">
                {{ lastScanResult?.message }}
              </div>

              <div class="result-actions mt-4 flex gap-2">
                <button (click)="openWalkInModal()" class="btn btn-sm btn-emerald">
                  Register as Walk-In
                </button>
                <button (click)="lastScanResult = null" class="btn btn-sm btn-secondary">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE 2: MANUAL SEARCH SECTION -->
      <div *ngIf="activeMode === 'manual'" class="manual-section">
        <div class="flat-card">
          <div class="search-toolbar flex justify-between items-center mb-4">
            <h3 class="card-heading">Manual Guest Directory & Quick Check-In</h3>
            <div class="flex gap-2">
              <input 
                type="text" 
                class="form-control" 
                [(ngModel)]="manualSearchTerm" 
                placeholder="Type name, email, or ID to filter..." 
                style="width: 320px;"
              />
            </div>
          </div>

          <div class="flat-table-container">
            <table class="flat-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Attendee Name</th>
                  <th>Email</th>
                  <th>Registration ID</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let reg of filteredManualRegistrations">
                  <td>
                    <span *ngIf="reg.checkInStatus" class="badge badge-emerald">Checked In</span>
                    <span *ngIf="!reg.checkInStatus" class="badge badge-gray">Not Checked In</span>
                  </td>
                  <td>
                    <strong>{{ reg.firstName }} {{ reg.lastName }}</strong>
                    <div class="text-xs text-muted">{{ reg.company }}</div>
                  </td>
                  <td class="font-mono text-xs">{{ reg.email }}</td>
                  <td class="font-mono text-xs">{{ reg.id }}</td>
                  <td><span class="badge badge-primary">{{ reg.registrationSource }}</span></td>
                  <td>
                    <button 
                      *ngIf="!reg.checkInStatus" 
                      (click)="manualCheckIn(reg)" 
                      class="btn btn-emerald btn-sm"
                    >
                      ✓ Check In
                    </button>
                    <button 
                      *ngIf="reg.checkInStatus" 
                      (click)="undoScan(reg.id)" 
                      class="btn btn-secondary btn-sm"
                    >
                      Undo Check-In
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- RECENT CHECK-INS TICKER TAPE -->
      <div class="recent-checkins-strip flat-card mt-6">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted">Today's Check-In Feed</h4>
          <span class="text-xs font-mono font-bold text-emerald">{{ checkedInCount }} of {{ totalRegistrations }} Checked In</span>
        </div>

        <div class="feed-grid" *ngIf="recentCheckIns.length > 0; else noFeed">
          <div *ngFor="let item of recentCheckIns" class="feed-item">
            <span class="feed-dot"></span>
            <div class="feed-text">
              <strong>{{ item.firstName }} {{ item.lastName }}</strong>
              <span class="feed-time font-mono">{{ formatTime(item.checkInTime) }}</span>
            </div>
            <span class="badge badge-gray text-2xs">{{ item.registrationType }}</span>
          </div>
        </div>

        <ng-template #noFeed>
          <div class="text-center text-xs text-muted py-2">
            No attendees checked in yet today.
          </div>
        </ng-template>
      </div>

      <!-- WALK-IN REGISTRATION MODAL (Auto-Checked In) -->
      <app-modal 
        [isOpen]="isWalkInModalOpen" 
        title="+ Register Walk-In Guest (Instant Check-In)" 
        maxWidth="600px"
        (close)="isWalkInModalOpen = false"
      >
        <div *ngIf="!walkInConfirmedReg">
          <p class="text-xs text-muted mb-4">
            ⚡ <strong>Instant Entry:</strong> Guests registered on-site are automatically marked <strong>Checked In</strong> upon creation.
          </p>

          <form [formGroup]="walkInForm" (ngSubmit)="submitWalkIn()">
            
            <!-- Dynamically Render Event Columns with Primary Key at the top (All Required) -->
            <ng-container *ngFor="let field of walkInOrderedFields">
              
              <!-- Custom Column (e.g. ID, Student ID, VIP Level) -->
              <div *ngIf="field.isCustom" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label }}
                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="walkInCustomAnswers[field.key]"
                  [ngModelOptions]="{standalone: true}"
                  [placeholder]="'Enter ' + field.label.toLowerCase() + '...'"
                  required
                />
              </div>

              <!-- Full Name -->
              <div *ngIf="field.key === 'fullName'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Full Name' }}
                  <span class="required-star">*</span>
                </label>
                <input type="text" class="form-control" formControlName="fullName" placeholder="Jane Doe" required />
              </div>

              <!-- First Name -->
              <div *ngIf="field.key === 'firstName'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'First Name' }}
                  <span class="required-star">*</span>
                </label>
                <input type="text" class="form-control" formControlName="firstName" placeholder="Jane" required />
              </div>

              <!-- Last Name -->
              <div *ngIf="field.key === 'lastName'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Last Name' }}
                  <span class="required-star">*</span>
                </label>
                <input type="text" class="form-control" formControlName="lastName" placeholder="Doe" required />
              </div>

              <!-- Email -->
              <div *ngIf="field.key === 'email'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Email Address' }}
                  <span class="required-star">*</span>
                </label>
                <input type="email" class="form-control" formControlName="email" placeholder="jane@company.com" required />
              </div>

              <!-- Phone -->
              <div *ngIf="field.key === 'phone'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Mobile / Phone' }}
                  <span class="required-star">*</span>
                </label>
                <input type="tel" class="form-control" formControlName="phone" placeholder="+1 555-0000" required />
              </div>

              <!-- Company -->
              <div *ngIf="field.key === 'company'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Company / Org' }}
                  <span class="required-star">*</span>
                </label>
                <input type="text" class="form-control" formControlName="company" placeholder="Acme Inc." required />
              </div>

              <!-- Job Title -->
              <div *ngIf="field.key === 'jobTitle'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Job Title' }}
                  <span class="required-star">*</span>
                </label>
                <input type="text" class="form-control" formControlName="jobTitle" placeholder="Lead Engineer" required />
              </div>

              <!-- Dietary -->
              <div *ngIf="field.key === 'dietary'" class="form-group mb-3">
                <label class="form-label text-xs">
                  {{ field.label || 'Dietary Preferences' }}
                  <span class="required-star">*</span>
                </label>
                <select class="form-control" formControlName="dietaryPreferences" required>
                  <option value="">-- Select Dietary Option --</option>
                  <option value="None">None / Standard</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                  <option value="Halal">Halal</option>
                </select>
              </div>

            </ng-container>

            <!-- Dynamic event questions for walk-in if any -->
            <div *ngIf="eventCustomQuestions.length > 0" class="walkin-questions mt-3">
              <div class="text-xs font-bold text-muted uppercase mb-2">Event Questions</div>
              <div *ngFor="let q of eventCustomQuestions" class="form-group mb-2">
                <label class="form-label text-xs">{{ q.question }} <span *ngIf="q.required" class="required-star">*</span></label>
                <input type="text" class="form-control text-xs" [(ngModel)]="walkInCustomAnswers[q.id]" [ngModelOptions]="{standalone: true}" required />
              </div>
            </div>

            <div class="modal-actions-strip flex justify-end gap-2 mt-4">
              <button type="button" (click)="isWalkInModalOpen = false" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" class="btn btn-emerald btn-sm">
                ✓ Create & Check In Guest
              </button>
            </div>
          </form>
        </div>

        <!-- Walk-In Success Screen with Pass -->
        <div *ngIf="walkInConfirmedReg" class="walkin-success-modal text-center py-3">
          <div class="success-icon-lg">✓</div>
          <h3 class="text-xl font-extrabold text-dark mt-2">WALK-IN REGISTERED & CHECKED IN</h3>
          <p class="text-xs text-muted">Badge created: <strong class="font-mono text-primary">{{ walkInConfirmedReg.id }}</strong></p>

          <div class="walkin-badge-card mt-3 p-3 bg-gray-50 border rounded-lg text-left">
            <div class="flex justify-between items-center">
              <div>
                <strong class="text-sm">{{ walkInConfirmedReg.firstName }} {{ walkInConfirmedReg.lastName }}</strong>
                <p class="text-xs text-muted">{{ walkInConfirmedReg.company }} • {{ walkInConfirmedReg.jobTitle }}</p>
              </div>
              <span class="badge badge-emerald">CHECKED IN</span>
            </div>
          </div>

          <div class="qr-preview-box-modal mt-3">
            <app-qr-display 
              [token]="walkInConfirmedReg.qrToken" 
              [guestName]="walkInConfirmedReg.firstName + ' ' + walkInConfirmedReg.lastName"
              [regId]="walkInConfirmedReg.id"
              [showActions]="true"
            ></app-qr-display>
          </div>

          <div class="flex justify-center gap-2 mt-4">
            <button (click)="resetWalkInModal()" class="btn btn-primary btn-sm">
              + Register Another Walk-In
            </button>
            <button (click)="isWalkInModalOpen = false; resetWalkInModal()" class="btn btn-secondary btn-sm">
              Done
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .checkin-terminal-wrapper {
      display: flex;
      flex-direction: column;
    }
    .terminal-banner {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
    }
    .banner-badge {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--flat-emerald-dark);
      background: var(--flat-emerald-light);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      letter-spacing: 0.05em;
    }
    .banner-event-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0.15rem 0;
    }
    .attendance-metric-capsule {
      display: flex;
      align-items: center;
      background: var(--flat-dark);
      color: var(--flat-white);
      border-radius: var(--radius-lg);
      padding: 0.65rem 1.25rem;
      gap: 1rem;
    }
    .metric-block {
      text-align: center;
    }
    .metric-block .m-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--flat-gray-400);
      display: block;
      text-transform: uppercase;
    }
    .metric-block .m-val {
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1.1;
    }
    .capsule-sep {
      color: var(--flat-gray-600);
      font-size: 1.25rem;
    }
    .badge-rate {
      background: var(--flat-gray-800);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-md);
    }
    .m-rate {
      color: var(--flat-emerald-light);
      font-size: 1.1rem;
      font-weight: 800;
    }
    .primary-action-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .primary-action-grid { grid-template-columns: 1fr; }
    }
    .action-btn {
      background: var(--flat-white);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .action-btn:hover {
      border-color: var(--flat-dark);
    }
    .action-btn.active {
      border-color: var(--flat-dark);
      background: var(--flat-gray-100);
      box-shadow: 0 0 0 2px var(--flat-dark);
    }
    .scan-btn .action-btn-icon { background: var(--flat-primary-light); color: var(--flat-primary-dark); }
    .walkin-btn .action-btn-icon { background: var(--flat-amber-light); color: var(--flat-amber-dark); }
    .manual-btn .action-btn-icon { background: var(--flat-violet-light); color: var(--flat-violet); }
    .action-btn-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .action-btn-text strong {
      display: block;
      font-size: 1rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .action-btn-text span {
      font-size: 0.775rem;
      color: var(--flat-gray-600);
    }

    /* Scanner Viewfinder Box */
    .viewfinder-box {
      height: 200px;
      background: var(--flat-dark);
      border-radius: var(--radius-lg);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .viewfinder-laser {
      position: absolute;
      left: 10%;
      right: 10%;
      height: 2px;
      background: var(--flat-emerald);
      box-shadow: 0 0 10px var(--flat-emerald);
      animation: laserSweep 2s infinite ease-in-out alternate;
    }
    @keyframes laserSweep {
      0% { top: 15%; }
      100% { top: 85%; }
    }
    .viewfinder-corners .corner {
      position: absolute;
      width: 24px;
      height: 24px;
      border: 3px solid var(--flat-white);
    }
    .corner.tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
    .corner.tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
    .corner.bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
    .corner.br { bottom: 20px; right: 20px; border-left: none; border-top: none; }
    .viewfinder-prompt {
      position: absolute;
      bottom: 12px;
    }
    .scan-input-form {
      display: flex;
      gap: 0.5rem;
    }
    .sim-pill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.35rem;
    }
    .sim-pill {
      background: var(--flat-gray-100);
      border: 1px solid var(--flat-border);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-pill);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--flat-gray-700);
      cursor: pointer;
    }
    .sim-pill:hover {
      background: var(--flat-primary-light);
      color: var(--flat-primary-dark);
    }
    .pill-coral {
      border-color: var(--flat-coral);
      color: var(--flat-coral);
    }

    /* Result Feedback Cards */
    .result-card {
      border: 2px solid var(--flat-border);
      animation: popIn 0.2s ease;
    }
    @keyframes popIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .result-success {
      border-color: var(--flat-emerald);
      background: #f0fdf4;
    }
    .result-warning {
      border-color: var(--flat-amber);
      background: #fffbeb;
    }
    .result-danger {
      border-color: var(--flat-coral);
      background: #fef2f2;
    }
    .result-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .result-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--flat-white);
    }
    .icon-success { background: var(--flat-emerald); }
    .icon-warning { background: var(--flat-amber); }
    .icon-danger { background: var(--flat-coral); }
    .res-tag {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .res-guest-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .result-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      background: var(--flat-white);
      padding: 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--flat-border);
    }
    .res-label {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--flat-gray-500);
      text-transform: uppercase;
      display: block;
    }
    .result-warning-message, .result-danger-message {
      padding: 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }
    .result-warning-message {
      background: var(--flat-amber-light);
      color: var(--flat-amber-dark);
    }
    .result-danger-message {
      background: var(--flat-coral-light);
      color: var(--flat-coral-dark);
    }
    .waiting-card {
      text-align: center;
      padding: 3rem 1.5rem;
    }
    .waiting-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

    /* Recent Check-Ins Strip */
    .feed-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }
    @media (max-width: 900px) {
      .feed-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .feed-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.65rem;
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
    }
    .feed-dot {
      width: 8px;
      height: 8px;
      background: var(--flat-emerald);
      border-radius: 50%;
    }
    .feed-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      font-size: 0.775rem;
    }
    .feed-time {
      font-size: 0.7rem;
      color: var(--flat-gray-500);
    }
    .text-2xs { font-size: 0.65rem; }
    .success-icon-lg {
      width: 54px;
      height: 54px;
      background: var(--flat-emerald);
      color: var(--flat-white);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: 800;
    }
  `]
})
export class EventCheckInTabComponent implements OnInit {
  event?: Event;
  registrations: Registration[] = [];
  eventCustomQuestions: CustomQuestion[] = [];

  activeMode: 'scan' | 'walkin' | 'manual' = 'scan';
  scanInputValue = '';
  lastScanResult: CheckInVerificationResult | null = null;
  manualSearchTerm = '';

  isWalkInModalOpen = false;
  walkInForm!: FormGroup;
  walkInCustomAnswers: Record<string, string> = {};
  walkInConfirmedReg: Registration | null = null;
  walkInOrderedFields: Array<{ key: string; label: string; isCustom?: boolean; isPrimaryKey?: boolean }> = [];
  walkInPrimaryKeyKey = '';

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private checkInService: CheckInService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.parent?.snapshot.paramMap.get('id');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.loadEventData(eventId);
      this.loadWalkInFieldsConfig(eventId);
    }
    this.initWalkInForm();
  }

  loadEventData(eventId: string): void {
    this.registrations = this.registrationService.getRegistrationsForEvent(eventId);
    this.eventCustomQuestions = this.eventService.getCustomQuestionsForEvent(eventId);
  }

  private loadWalkInFieldsConfig(eventId: string): void {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.mappingRows) && parsed.mappingRows.length > 0) {
          this.walkInPrimaryKeyKey = parsed.primaryKeyColumnKey || '';

          const rawOrdered: Array<{ key: string; label: string; isCustom?: boolean; isPrimaryKey?: boolean }> = [];

          for (const r of parsed.mappingRows) {
            const isPk = (this.walkInPrimaryKeyKey === r.key);
            rawOrdered.push({
              key: r.key,
              label: r.label || r.key,
              isCustom: !!r.isCustom,
              isPrimaryKey: isPk
            });
          }

          // Sort so that Primary Key is always at the top of the walk-in form
          this.walkInOrderedFields = rawOrdered.sort((a, b) => {
            if (a.isPrimaryKey) return -1;
            if (b.isPrimaryKey) return 1;
            return 0;
          });
          return;
        }
      }
    } catch {
      // ignore error, use fallback
    }

    // Default fallback columns if no Excel import mapping was saved
    this.walkInOrderedFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email Address' },
      { key: 'phone', label: 'Mobile / Phone' },
      { key: 'company', label: 'Company / Org' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'dietary', label: 'Dietary Preferences' }
    ];
  }

  initWalkInForm(): void {
    this.walkInForm = this.fb.group({
      fullName: [''],
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      company: [''],
      jobTitle: [''],
      dietaryPreferences: ['']
    });
  }

  get totalRegistrations(): number {
    return this.registrations.length;
  }

  get checkedInCount(): number {
    return this.registrations.filter(r => r.checkInStatus).length;
  }

  get attendancePercent(): number {
    if (!this.totalRegistrations) return 0;
    return Math.round((this.checkedInCount / this.totalRegistrations) * 100);
  }

  get recentCheckIns(): Registration[] {
    return [...this.registrations]
      .filter(r => r.checkInStatus && r.checkInTime)
      .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())
      .slice(0, 8);
  }

  get demoScanTargets(): Registration[] {
    return this.registrations.slice(0, 4);
  }

  get filteredManualRegistrations(): Registration[] {
    if (!this.manualSearchTerm.trim()) return this.registrations;
    const q = this.manualSearchTerm.toLowerCase().trim();
    return this.registrations.filter(r => 
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }

  handleScanInput(codeOrToken: string): void {
    if (!this.event || !codeOrToken.trim()) return;

    this.lastScanResult = this.checkInService.verifyAndCheckIn(codeOrToken, this.event.id, 'Staff Desk 1');
    this.scanInputValue = '';
    this.loadEventData(this.event.id);

    if (this.lastScanResult.status === 'success') {
      this.toastService.success('Check-In Confirmed', `${this.lastScanResult.registration?.firstName} verified.`);
    } else if (this.lastScanResult.status === 'already-checked-in') {
      this.toastService.warning('Already In', 'Guest has already been checked in.');
    } else {
      this.toastService.error('Invalid', this.lastScanResult.message);
    }
  }

  manualCheckIn(reg: Registration): void {
    this.handleScanInput(reg.id);
  }

  undoScan(regId: string): void {
    if (!this.event) return;
    this.checkInService.undoCheckIn(regId);
    this.loadEventData(this.event.id);
    this.lastScanResult = null;
    this.toastService.info('Check-In Reverted', 'Attendance status reset to not checked in.');
  }

  openWalkInModal(): void {
    this.resetWalkInModal();
    this.isWalkInModalOpen = true;
  }

  resetWalkInModal(): void {
    this.walkInConfirmedReg = null;
    this.walkInForm.reset();
    this.walkInCustomAnswers = {};
  }

  submitWalkIn(): void {
    if (!this.event || this.walkInForm.invalid) return;

    const val = this.walkInForm.value;
    const formattedCustom = Object.entries(this.walkInCustomAnswers).map(([qid, ans]) => {
      const q = this.eventCustomQuestions.find(x => x.id === qid);
      return {
        questionId: qid,
        questionText: q?.question || 'Question',
        answer: ans
      };
    });

    const newReg = this.registrationService.registerWalkIn({
      eventId: this.event.id,
      firstName: val.firstName,
      lastName: val.lastName,
      email: val.email,
      phone: val.phone,
      company: val.company,
      jobTitle: val.jobTitle,
      dietaryPreferences: val.dietaryPreferences,
      checkedInBy: 'Staff Walk-In Terminal',
      customAnswers: formattedCustom
    });

    this.walkInConfirmedReg = newReg;
    this.loadEventData(this.event.id);
    this.toastService.success('Walk-In Registered', `${newReg.firstName} ${newReg.lastName} checked in.`);
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}
