import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { Event, Registration } from '../../core/models/event.model';
import { QrDisplayComponent } from '../../shared/components/qr-display/qr-display.component';
import { RsvpBadgeComponent } from '../../shared/components/rsvp-badge/rsvp-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

type WalkInField = { key: string; label: string; isCustom?: boolean; isPrimaryKey?: boolean; required?: boolean };

@Component({
  selector: 'app-attendance-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QrDisplayComponent, RsvpBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="confirm-wrapper container container-narrow">

      <!-- Event not found -->
      <div *ngIf="eventLoadAttempted && !event" class="empty-state text-center">
        <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
        <h2 style="font-size:1.5rem;font-weight:800;">Event Not Found</h2>
        <p class="text-muted text-sm mt-2">This event could not be found.</p>
        <a routerLink="/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-block;">← Back to Home</a>
      </div>

      <ng-container *ngIf="event">
        <!-- Event Top Header Banner -->
        <div class="event-hero-card">
          <div class="event-banner-img"
            [style.backgroundImage]="'url(' + event.bannerUrl + ')'"
            [style.backgroundSize]="event.bannerImgW ? (event.bannerImgW + 'px ' + event.bannerImgH + 'px') : 'contain'"
            [style.backgroundPosition]="event.bannerImgW ? (event.bannerOffsetX + 'px ' + event.bannerOffsetY + 'px') : 'center'"
          >
            <div class="banner-top-badge">
              <app-status-badge [status]="event.status"></app-status-badge>
              <span class="category-pill">{{ event.category | uppercase }}</span>
            </div>
          </div>

          <div class="hero-body">
            <span class="event-badge-label">OFFICIAL EVENT REGISTRATION</span>
            <h1 class="event-title">{{ event.name }}</h1>
            <p class="event-tagline" *ngIf="event.tagline">{{ event.tagline }}</p>

            <div class="event-schedule-grid">
              <div class="schedule-box">
                <span class="s-icon">🗓</span>
                <div>
                  <span class="s-label">Date & Time</span>
                  <strong class="s-val">{{ event.date }} • {{ event.startTime }} - {{ event.endTime }}</strong>
                </div>
              </div>

              <div class="schedule-box">
                <span class="s-icon">📍</span>
                <div>
                  <span class="s-label">Location / Venue</span>
                  <strong class="s-val">{{ event.venue }}</strong>
                  <p class="text-xs text-muted" *ngIf="event.address">{{ event.address }}</p>
                </div>
              </div>
            </div>

            <!-- Registration Deadline & Capacity Alert -->
            <div class="deadline-strip flex justify-between items-center" *ngIf="isRegistrationOpen">
              <span class="text-xs font-bold text-gray-700">
                ⏳ RSVP Deadline: <strong>{{ event.registrationDeadline }}</strong>
              </span>
              <span class="text-xs font-bold text-emerald">
                ✓ Available Slots: <strong>{{ remainingSlots }} left</strong>
              </span>
            </div>

            <div *ngIf="!isRegistrationOpen" class="closed-alert">
              <strong>Registration is currently closed for this event.</strong>
            </div>
          </div>
        </div>

        <!-- Section Title for Attendance Confirmation -->
        <div class="attendance-section-header">
          <span class="page-tag">ATTENDANCE CONFIRMATION</span>
          <p class="page-sub text-muted">
            Already registered? Enter your details below to confirm your attendance.
          </p>
        </div>

        <!-- STEP 1: Lookup -->
        <div class="lookup-card flat-card" *ngIf="step === 'lookup'">
          <h3 class="card-heading">Find Your Registration</h3>
          <p class="text-muted text-sm mb-4">Enter your registration ID, email address, or full name to locate your record.</p>

          <form (ngSubmit)="onSearch()" class="search-form">
            <div class="form-group mb-0 flex-1">
              <input
                type="text"
                class="form-control form-control-lg"
                [(ngModel)]="searchQuery"
                name="searchQuery"
                placeholder="e.g. EVT-2026-000001 or jane@company.com"
                required
              />
            </div>
            <button type="submit" [disabled]="!searchQuery.trim() || isSearching" class="btn btn-primary btn-lg search-btn">
              🔍 Find My Registration
            </button>
          </form>

          <!-- No results -->
          <div *ngIf="hasSearched && results.length === 0" class="not-found-banner mt-4">
            <strong>No registration found.</strong>
            <p class="text-sm text-muted mt-1">
              Check your spelling or
              <a [routerLink]="['/event', event.id, 'register']">register here</a>
              if you haven't yet.
            </p>
          </div>

          <!-- Results list -->
          <div *ngIf="results.length > 0" class="results-list mt-4">
            <div class="text-xs font-bold text-muted uppercase mb-2">{{ results.length }} record(s) found — select yours:</div>
            <div
              *ngFor="let r of results"
              class="result-row"
              (click)="selectRegistration(r)"
            >
              <div class="result-info">
                <strong>{{ r.firstName }} {{ r.lastName }}</strong>
                <span class="text-xs text-muted">{{ r.email }}</span>
              </div>
              <div class="result-right">
                <app-rsvp-badge [status]="r.rsvpStatus"></app-rsvp-badge>
                <span class="btn btn-sm btn-outline" style="margin-left:0.5rem;">Select →</span>
              </div>
            </div>
          </div>

          <!-- Walk-In divider (only if walk-ins are allowed) -->
          <div *ngIf="event.isWalkInAllowed" class="walkin-divider">
            <span>or</span>
          </div>

          <!-- Walk-In button -->
          <div *ngIf="event.isWalkInAllowed" class="text-center">
            <button type="button" class="btn btn-walkin" (click)="step = 'walkin'">
              ⚡ Register as a Walk-In
            </button>
            <p class="text-xs text-muted mt-2">
              Not yet registered? Walk-ins are welcome — you'll be checked in immediately.
            </p>
          </div>
        </div>

        <!-- STEP 2: Confirm existing registration -->
        <div class="confirm-card flat-card" *ngIf="step === 'confirm' && selected">
          <div class="confirm-header">
            <button class="back-btn text-xs text-muted" (click)="step = 'lookup'; selected = null">← Search again</button>
            <h3 class="card-heading">Confirm Your Attendance</h3>
          </div>

          <!-- Registration Details -->
          <div class="detail-block">
            <div class="detail-row">
              <span class="d-label">Registration ID</span>
              <span class="d-val font-mono">{{ selected.id }}</span>
            </div>
            <div class="detail-row">
              <span class="d-label">Name</span>
              <span class="d-val">{{ selected.firstName }} {{ selected.lastName }}</span>
            </div>
            <div class="detail-row" *ngIf="selected.email">
              <span class="d-label">Email</span>
              <span class="d-val">{{ selected.email }}</span>
            </div>
            <div class="detail-row" *ngIf="selected.company">
              <span class="d-label">Organization</span>
              <span class="d-val">{{ selected.company }}</span>
            </div>
            <div class="detail-row">
              <span class="d-label">Current RSVP</span>
              <span class="d-val"><app-rsvp-badge [status]="selected.rsvpStatus"></app-rsvp-badge></span>
            </div>
          </div>

          <!-- Custom answers if any -->
          <div *ngIf="selected.customAnswers && selected.customAnswers.length" class="custom-answers-block">
            <div *ngFor="let ca of selected.customAnswers" class="detail-row">
              <span class="d-label">{{ ca.questionText }}</span>
              <span class="d-val">{{ ca.answer }}</span>
            </div>
          </div>

          <!-- Already confirmed state -->
          <div *ngIf="selected.rsvpStatus === 'attending'" class="already-confirmed-banner">
            ✅ Your attendance is already confirmed as <strong>Attending</strong>.
          </div>

          <div class="confirm-action mt-4">
            <button
              class="btn btn-emerald btn-lg btn-block"
              (click)="confirmAttendance()"
              [disabled]="isConfirming"
            >
              <span *ngIf="!isConfirming">✅ Confirm I Will Attend</span>
              <span *ngIf="isConfirming">Confirming...</span>
            </button>
            <p class="text-xs text-center text-muted mt-2">
              This will update your RSVP to <strong>Attending</strong> and mark you as <strong>Checked In</strong>.
            </p>
          </div>
        </div>

        <!-- STEP: Walk-In Registration Form -->
        <div class="confirm-card flat-card" *ngIf="step === 'walkin'">
          <div class="confirm-header">
            <button class="back-btn text-xs text-muted" (click)="step = 'lookup'; resetWalkIn()">← Back</button>
            <h3 class="card-heading">⚡ Walk-In Registration</h3>
            <p class="text-muted text-sm mb-3">
              Fill in your details to register on-site. You will be automatically checked in.
            </p>
          </div>

          <form (ngSubmit)="submitWalkIn()" #walkInFormRef="ngForm">
            <ng-container *ngFor="let field of walkInFields">

              <!-- Custom field -->
              <div *ngIf="field.isCustom" class="form-group mb-3">
                <label class="form-label text-sm">
                  {{ field.label }}
                  <span *ngIf="field.required" class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="walkInAnswers[field.key]"
                  [name]="'wi_' + field.key"
                  [required]="!!field.required"
                  [placeholder]="'Enter ' + field.label.toLowerCase() + '...'"
                />
              </div>

              <!-- Full Name -->
              <div *ngIf="field.key === 'fullName'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="walkInData.fullName" name="wi_fullName"
                  [required]="!!field.required" placeholder="Jane Doe" />
              </div>

              <!-- First Name -->
              <div *ngIf="field.key === 'firstName'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="walkInData.firstName" name="wi_firstName"
                  [required]="!!field.required" placeholder="Jane" />
              </div>

              <!-- Last Name -->
              <div *ngIf="field.key === 'lastName'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="walkInData.lastName" name="wi_lastName"
                  [required]="!!field.required" placeholder="Doe" />
              </div>

              <!-- Email -->
              <div *ngIf="field.key === 'email'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="email" class="form-control" [(ngModel)]="walkInData.email" name="wi_email"
                  [required]="!!field.required" placeholder="jane@company.com" />
              </div>

              <!-- Phone -->
              <div *ngIf="field.key === 'phone'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="tel" class="form-control" [(ngModel)]="walkInData.phone" name="wi_phone"
                  [required]="!!field.required" placeholder="+1 555-0000" />
              </div>

              <!-- Company -->
              <div *ngIf="field.key === 'company'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="walkInData.company" name="wi_company"
                  [required]="!!field.required" placeholder="Acme Inc." />
              </div>

              <!-- Job Title -->
              <div *ngIf="field.key === 'jobTitle'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="walkInData.jobTitle" name="wi_jobTitle"
                  [required]="!!field.required" placeholder="Engineer" />
              </div>

              <!-- Dietary -->
              <div *ngIf="field.key === 'dietary'" class="form-group mb-3">
                <label class="form-label text-sm">{{ field.label }} <span *ngIf="field.required" class="required-star">*</span></label>
                <select class="form-control" [(ngModel)]="walkInData.dietaryPreferences" name="wi_dietary"
                  [required]="!!field.required">
                  <option value="">-- Select --</option>
                  <option value="None">None / Standard</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                  <option value="Halal">Halal</option>
                </select>
              </div>

            </ng-container>

            <div class="modal-actions-strip flex justify-end gap-2 mt-4">
              <button type="button" (click)="step = 'lookup'; resetWalkIn()" class="btn btn-secondary">Cancel</button>
              <button type="submit" [disabled]="walkInFormRef.invalid || isSubmittingWalkIn" class="btn btn-emerald">
                <span *ngIf="!isSubmittingWalkIn">⚡ Register & Check In</span>
                <span *ngIf="isSubmittingWalkIn">Processing...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- STEP 3: Success (both confirmation and walk-in share this) -->
        <div class="success-card flat-card text-center" *ngIf="step === 'success' && confirmed">
          <div class="success-icon">✓</div>
          <h2 class="success-title">{{ isWalkInSuccess ? 'Walk-In Registered & Checked In!' : 'Attendance Confirmed!' }}</h2>
          <p class="text-muted text-sm mt-1 mb-4">
            <strong>{{ confirmed.firstName }} {{ confirmed.lastName }}</strong> —
            {{ isWalkInSuccess ? 'you have been registered on-site for' : 'you are confirmed as attending' }}
            <strong>{{ event.name }}</strong>.
          </p>

          <!-- Registration ID -->
          <div class="reg-id-pill">
            <span class="text-xs text-muted">Registration ID:</span>
            <span class="font-mono font-bold text-primary">{{ confirmed.id }}</span>
          </div>

          <!-- QR Pass (only when event has QR enabled) -->
          <div *ngIf="event.isQrEnabled !== false && confirmed.qrToken" class="qr-section mt-4">
            <p class="text-xs text-muted mb-2">Your QR Pass is ready. Present it at the entrance for check-in.</p>
            <app-qr-display
              [token]="confirmed.qrToken"
              [guestName]="confirmed.firstName + ' ' + confirmed.lastName"
              [regId]="confirmed.id"
              [showActions]="true"
            ></app-qr-display>
          </div>

          <!-- No-QR message -->
          <div *ngIf="event.isQrEnabled === false" class="no-qr-notice mt-4">
            📋 Present your Registration ID at the entrance for manual check-in.
          </div>

          <div class="flex justify-center gap-3 mt-5">
            <button (click)="reset()" class="btn btn-secondary">
              {{ isWalkInSuccess ? 'Back to Attendance Confirmation Page' : 'Confirm Another Attendee' }}
            </button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .confirm-wrapper {
      padding: 2rem 1.25rem 4rem;
      min-height: 100vh;
    }
    .event-hero-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .event-banner-img {
      height: 200px;
      position: relative;
      overflow: hidden;
      padding: 1rem 1.25rem;
      background-repeat: no-repeat;
      background-color: #111;
    }
    .banner-top-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-pill {
      background: var(--flat-dark);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .hero-body {
      padding: 1.75rem;
    }
    .event-badge-label {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.35rem;
    }
    .event-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.2;
    }
    .event-tagline {
      font-size: 1rem;
      color: var(--flat-gray-600);
      margin-top: 0.4rem;
    }
    .event-schedule-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    @media (max-width: 640px) {
      .event-schedule-grid { grid-template-columns: 1fr; }
    }
    .schedule-box {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .s-icon { font-size: 1.25rem; }
    .s-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--flat-gray-500);
      text-transform: uppercase;
    }
    .s-val {
      font-size: 0.9rem;
      color: var(--flat-dark);
    }
    .deadline-strip {
      margin-top: 1.25rem;
      padding: 0.75rem 1rem;
      background: var(--flat-gray-100);
      border-radius: var(--radius-md);
    }
    .closed-alert {
      margin-top: 1.25rem;
      padding: 1rem;
      background: var(--flat-coral-light);
      color: var(--flat-coral-dark);
      border: 1px solid var(--flat-coral);
      border-radius: var(--radius-md);
      text-align: center;
    }
    .attendance-section-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .page-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.35rem;
    }
    .page-sub {
      font-size: 0.95rem;
      margin-bottom: 0;
    }
    .lookup-card, .confirm-card, .success-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
      margin: 0 auto;
    }
    @media (max-width: 640px) {
      .lookup-card, .confirm-card, .success-card { padding: 1.25rem; }
    }
    .search-form {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .flex-1 { flex: 1; }
    .search-btn { white-space: nowrap; }
    @media (max-width: 560px) {
      .search-form { flex-direction: column; align-items: stretch; }
    }
    .not-found-banner {
      background: var(--flat-coral-light, #fff1f0);
      border: 1px solid var(--flat-coral, #f56565);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      font-size: 0.875rem;
    }
    /* Walk-In divider */
    .walkin-divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.5rem 0 1rem;
      color: var(--flat-gray-400, #9ca3af);
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .walkin-divider::before,
    .walkin-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--flat-border);
    }
    /* Walk-In button */
    .btn-walkin {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      padding: 0.65rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      transition: opacity 0.15s;
      letter-spacing: 0.01em;
    }
    .btn-walkin:hover { opacity: 0.9; }
    /* Results list */
    .results-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      background: var(--flat-white);
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .result-row:hover {
      background: var(--flat-primary-light, #eff6ff);
      border-color: var(--flat-primary);
    }
    .result-info { display: flex; flex-direction: column; gap: 2px; }
    .result-right { display: flex; align-items: center; }
    /* Confirm card */
    .confirm-header { margin-bottom: 1.25rem; }
    .back-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      margin-bottom: 0.5rem; display: block;
    }
    .back-btn:hover { color: var(--flat-primary); }
    .detail-block, .custom-answers-block {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--flat-border);
      font-size: 0.875rem;
      gap: 1rem;
    }
    .detail-row:last-child { border-bottom: none; }
    .d-label { color: var(--flat-gray-500, #6b7280); font-size: 0.8rem; font-weight: 600; flex-shrink: 0; }
    .d-val { font-weight: 700; color: var(--flat-dark); text-align: right; }
    .already-confirmed-banner {
      background: var(--flat-emerald-light);
      color: var(--flat-emerald-dark);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      margin-top: 0.75rem;
    }
    .btn-block { width: 100%; }
    .required-star { color: #e53e3e; margin-left: 2px; }
    /* Success */
    .success-icon {
      width: 64px; height: 64px;
      background: var(--flat-emerald);
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
    }
    .success-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0.75rem 0 0;
    }
    .reg-id-pill {
      display: inline-flex;
      gap: 0.5rem;
      align-items: center;
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-pill);
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
    }
    .qr-section { max-width: 340px; margin: 0 auto; }
    .no-qr-notice {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      font-size: 0.875rem;
      color: var(--flat-gray-600, #57606a);
    }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-5 { margin-top: 1.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .modal-actions-strip { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .empty-state { padding: 4rem 1.25rem; }
    .card-heading {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin-bottom: 0.25rem;
    }
  `]
})
export class AttendanceConfirmationComponent implements OnInit {
  event?: Event;
  eventLoadAttempted = false;

  // Lookup / confirm state
  step: 'lookup' | 'confirm' | 'walkin' | 'success' = 'lookup';
  searchQuery = '';
  hasSearched = false;
  isSearching = false;
  results: Registration[] = [];
  selected: Registration | null = null;
  confirmed: Registration | null = null;
  isConfirming = false;
  isWalkInSuccess = false;

  // Walk-in form state
  walkInFields: WalkInField[] = [];
  walkInData: {
    fullName: string; firstName: string; lastName: string;
    email: string; phone: string; company: string;
    jobTitle: string; dietaryPreferences: string;
  } = { fullName: '', firstName: '', lastName: '', email: '', phone: '', company: '', jobTitle: '', dietaryPreferences: '' };
  walkInAnswers: Record<string, string> = {};
  isSubmittingWalkIn = false;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService
  ) {}

  get isRegistrationOpen(): boolean {
    if (!this.event) return false;
    return this.event.status === 'registration-open' || this.event.status === 'ongoing';
  }

  get remainingSlots(): number {
    if (!this.event) return 0;
    const current = this.registrationService.getRegistrationsForEvent(this.event.id).length;
    return Math.max(0, this.event.capacity - current);
  }

  ngOnInit(): void {
    // 1. Check for compressed payload in query parameter (works for fresh phones/browsers with no prior storage)
    const edParam = this.route.snapshot.queryParamMap.get('ed');
    if (edParam) {
      const hydrated = this.eventService.hydrateFromPayload(edParam);
      if (hydrated) {
        this.event = hydrated;
      }
    }

    // 2. Fallback to reading event from local storage by eventId parameter
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId && !this.event) {
      this.event = this.eventService.getEventById(eventId);
    }

    // 3. Fallback check window.location for any query param in SPA redirect edge cases
    if (!this.event && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const edRaw = params.get('ed') || params.get('q');
      if (edRaw) {
        const hydrated = this.eventService.hydrateFromPayload(edRaw);
        if (hydrated) {
          this.event = hydrated;
        }
      }
    }

    if (this.event) {
      this.loadWalkInFields(this.event.id);
    }
    this.eventLoadAttempted = true;
  }

  // ── Walk-In Field Config ───────────────────────────────────────────
  private loadWalkInFields(eventId: string): void {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.mappingRows) && parsed.mappingRows.length > 0) {
          const pk = parsed.primaryKeyColumnKey || '';
          const raw: WalkInField[] = parsed.mappingRows.map((r: any) => ({
            key: r.key,
            label: r.label || r.key,
            isCustom: !!r.isCustom,
            isPrimaryKey: r.key === pk,
            required: !!r.required
          }));
          // Primary key always at the top
          this.walkInFields = raw.sort((a, b) => (a.isPrimaryKey ? -1 : b.isPrimaryKey ? 1 : 0));
          return;
        }
      }
    } catch { /* ignore */ }

    // Default fields when no mapping saved
    this.walkInFields = [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name', required: true },
      { key: 'email', label: 'Email Address', required: true },
      { key: 'phone', label: 'Mobile / Phone' },
      { key: 'company', label: 'Company / Organization' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'dietary', label: 'Dietary Preferences' }
    ];
  }

  resetWalkIn(): void {
    this.walkInData = { fullName: '', firstName: '', lastName: '', email: '', phone: '', company: '', jobTitle: '', dietaryPreferences: '' };
    this.walkInAnswers = {};
  }

  // ── Walk-In Submission ─────────────────────────────────────────────
  submitWalkIn(): void {
    if (!this.event) return;

    // Resolve name
    let firstName = (this.walkInData.firstName || '').trim();
    let lastName  = (this.walkInData.lastName  || '').trim();

    if (!firstName && !lastName && this.walkInData.fullName) {
      const parts = this.walkInData.fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName  = parts.slice(1).join(' ') || '';
    }

    // Try custom "name" field as last resort
    if (!firstName && !lastName) {
      const nameField = this.walkInFields.find(f =>
        f.key === 'fullName' || f.label.toLowerCase().includes('name')
      );
      if (nameField && this.walkInAnswers[nameField.key]) {
        const parts = this.walkInAnswers[nameField.key].trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName  = parts.slice(1).join(' ') || '';
      }
    }

    if (!firstName && !lastName) { firstName = 'Walk-In'; lastName = 'Guest'; }

    // Build custom answers with correct labels
    const customAnswers = Object.entries(this.walkInAnswers)
      .filter(([, v]) => !!v)
      .map(([qid, ans]) => {
        const field = this.walkInFields.find(f => f.key === qid);
        return { questionId: qid, questionText: field?.label || qid, answer: ans };
      });

    this.isSubmittingWalkIn = true;
    setTimeout(() => {
      const newReg = this.registrationService.registerWalkIn({
        eventId: this.event!.id,
        firstName,
        lastName,
        email: (this.walkInData.email || '').trim(),
        phone: this.walkInData.phone || undefined,
        company: this.walkInData.company || undefined,
        jobTitle: this.walkInData.jobTitle || undefined,
        dietaryPreferences: this.walkInData.dietaryPreferences || undefined,
        checkedInBy: 'On-Site Walk-In',
        customAnswers
      });
      this.isSubmittingWalkIn = false;
      this.confirmed = newReg;
      this.isWalkInSuccess = true;
      this.step = 'success';
      this.toastService.success('Walk-In Registered!', `${newReg.firstName} ${newReg.lastName} is checked in.`);
    }, 300);
  }

  // ── Existing registration confirm ─────────────────────────────────
  onSearch(): void {
    if (!this.event || !this.searchQuery.trim()) return;
    this.isSearching = true;
    this.hasSearched = true;
    setTimeout(() => {
      this.results = this.registrationService.lookupRegistration(this.searchQuery.trim(), this.event!.id);
      this.isSearching = false;
    }, 200);
  }

  selectRegistration(reg: Registration): void {
    this.selected = reg;
    this.step = 'confirm';
  }

  confirmAttendance(): void {
    if (!this.selected || !this.event) return;
    this.isConfirming = true;
    setTimeout(() => {
      const nowIso = new Date().toISOString();
      const updated = this.registrationService.updateRegistration(this.selected!.id, {
        rsvpStatus: 'attending',
        checkInStatus: true,
        checkInTime: nowIso,
        checkedInBy: 'On-Site Attendance Confirmation'
      });
      this.isConfirming = false;
      if (updated) {
        this.confirmed = updated;
        this.isWalkInSuccess = false;
        this.step = 'success';
        this.toastService.success('Confirmed & Checked In!', `${updated.firstName} ${updated.lastName} is confirmed and checked in.`);
      } else {
        this.toastService.error('Error', 'Could not update registration. Please try again.');
      }
    }, 300);
  }

  reset(): void {
    this.step = 'lookup';
    this.searchQuery = '';
    this.hasSearched = false;
    this.results = [];
    this.selected = null;
    this.confirmed = null;
    this.isWalkInSuccess = false;
    this.resetWalkIn();
  }
}
