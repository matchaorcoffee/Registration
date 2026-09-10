import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { Event, Registration, RSVPStatus } from '../../core/models/event.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RsvpBadgeComponent } from '../../shared/components/rsvp-badge/rsvp-badge.component';

@Component({
  selector: 'app-event-rsvp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, RsvpBadgeComponent],
  template: `
    <div class="rsvp-portal-wrapper" *ngIf="event">
      <div class="container container-narrow">
        
        <!-- Hero Header -->
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
            <span class="event-badge-label">OFFICIAL ATTENDEE RSVP PORTAL</span>
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
                  <p class="text-xs text-muted">{{ event.address }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RSVP Lookup & Confirmation Form -->
        <div class="rsvp-card-box flat-card mt-6">
          <div class="rsvp-card-header">
            <h2 class="text-xl font-extrabold text-dark">Confirm Your Attendance</h2>
            <p class="text-muted text-sm">
              If you are on the guest list (imported or pre-registered), verify your name or email below to confirm your attendance.
            </p>
          </div>

          <!-- Step 1: Find Registration in the List -->
          <div *ngIf="!selectedRegistration" class="lookup-step mt-4">
            <div class="form-group">
              <label class="form-label font-bold">Find Your Name or Email on the Guest List</label>

              <!-- Search-by selector (shown when organizer has configured columns) -->
              <div *ngIf="searchableColumns.length > 0" class="search-by-row flex gap-2 items-center mb-2">
                <label class="text-xs text-muted font-bold white-space-nowrap" style="white-space:nowrap">Search by:</label>
                <div class="search-by-pills flex gap-1 flex-wrap">
                  <button
                    *ngFor="let col of searchableColumns"
                    type="button"
                    class="pill-btn"
                    [class.active]="searchByKey === col.key"
                    (click)="searchByKey = col.key; hasSearched = false; searchResults = []"
                  >{{ col.label }}</button>
                </div>
              </div>

              <div class="flex gap-2">
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="searchAttendee()"
                  [placeholder]="searchPlaceholder"
                />
                <button (click)="searchAttendee()" class="btn btn-primary">
                  🔍 Find Me
                </button>
              </div>
            </div>

            <!-- Matching Attendees List -->
            <div *ngIf="searchResults.length > 0" class="matching-results-list mt-4">
              <div class="text-xs font-bold text-muted uppercase mb-2">Matching Invitations Found ({{ searchResults.length }})</div>
              
              <div *ngFor="let reg of searchResults" class="match-item-card" (click)="selectAttendee(reg)">
                <div class="flex justify-between items-center">
                  <div>
                    <!-- When config columns are present, show mapped values; otherwise fall back to standard fields -->
                    <ng-container *ngIf="searchableColumns.length > 0; else defaultDisplay">
                      <div class="match-col-row" *ngFor="let col of searchableColumns">
                        <span class="match-col-label">{{ col.label }}:</span>
                        <strong class="match-col-val">{{ getColValue(reg, col) || '—' }}</strong>
                      </div>
                    </ng-container>
                    <ng-template #defaultDisplay>
                      <strong class="text-base text-dark">{{ reg.firstName }} {{ reg.lastName }}</strong>
                      <div class="text-xs text-muted font-mono" *ngIf="reg.email">{{ reg.email }}</div>
                      <div class="text-xs text-muted" *ngIf="reg.company || reg.jobTitle">
                        {{ reg.jobTitle }} • {{ reg.company }}
                      </div>
                    </ng-template>
                  </div>
                  <div class="text-right flex flex-col items-end gap-1">
                    <app-rsvp-badge [status]="reg.rsvpStatus"></app-rsvp-badge>
                    <span class="btn btn-secondary btn-xs mt-1">Select & RSVP →</span>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="hasSearched && searchResults.length === 0" class="empty-results-box p-4 bg-gray-50 border rounded-lg text-center mt-4">
              <p class="text-sm font-bold text-dark">No guest match found for "{{ searchQuery }}"</p>
              <p class="text-xs text-muted mt-1">
                Not on the guest list yet? You can register directly using the public registration form.
              </p>
              <div class="mt-3">
                <a [routerLink]="['/event', event.id, 'register']" class="btn btn-primary btn-sm">
                  + Register as New Guest
                </a>
              </div>
            </div>
          </div>

          <!-- Step 2: Confirm RSVP Selection -->
          <div *ngIf="selectedRegistration" class="confirm-step mt-4">
            <div class="selected-guest-banner p-3 bg-primary-light border rounded-lg flex justify-between items-center mb-4">
              <div>
                <span class="text-xs font-bold uppercase text-primary">Confirming Attendance For:</span>
                <div class="font-extrabold text-base text-dark">
                  {{ selectedRegistration.firstName }} {{ selectedRegistration.lastName }}
                </div>
                <span class="text-xs text-muted font-mono">{{ selectedRegistration.id }}</span>
              </div>
              <button (click)="selectedRegistration = null" class="btn btn-outline btn-xs">
                Switch Guest
              </button>
            </div>

            <!-- RSVP Choice Radio Grid -->
            <div class="rsvp-decision-group">
              <label class="form-label font-bold">Select Your Response <span class="required-star">*</span></label>
              <div class="rsvp-options-grid">
                <label class="rsvp-card" [class.selected]="selectedRsvp === 'attending'">
                  <input type="radio" value="attending" [(ngModel)]="selectedRsvp" name="rsvpOption" />
                  <span class="rsvp-emoji">🎉</span>
                  <div>
                    <strong class="rsvp-text block">Yes, Attending</strong>
                    <span class="text-2xs text-muted">Generate instant QR check-in pass</span>
                  </div>
                </label>

                <label class="rsvp-card" [class.selected]="selectedRsvp === 'maybe'">
                  <input type="radio" value="maybe" [(ngModel)]="selectedRsvp" name="rsvpOption" />
                  <span class="rsvp-emoji">🤔</span>
                  <div>
                    <strong class="rsvp-text block">Maybe</strong>
                    <span class="text-2xs text-muted">Tentative attendance</span>
                  </div>
                </label>

                <label class="rsvp-card" [class.selected]="selectedRsvp === 'declined'">
                  <input type="radio" value="declined" [(ngModel)]="selectedRsvp" name="rsvpOption" />
                  <span class="rsvp-emoji">❌</span>
                  <div>
                    <strong class="rsvp-text block">Unable to Attend</strong>
                    <span class="text-2xs text-muted">No QR pass will be issued</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="confirm-actions flex justify-between items-center mt-6 pt-4 border-t">
              <button (click)="selectedRegistration = null" class="btn btn-secondary">
                ← Back
              </button>
              <button (click)="submitRsvpConfirmation()" [disabled]="isSubmitting" class="btn btn-primary btn-lg">
                <span *ngIf="selectedRsvp === 'attending'">✓ Confirm & Get QR Check-In Pass →</span>
                <span *ngIf="selectedRsvp === 'maybe'">✓ Submit Tentative RSVP →</span>
                <span *ngIf="selectedRsvp === 'declined'">Submit RSVP (Decline) →</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Direct Link to General Registration -->
        <div class="text-center mt-6">
          <span class="text-xs text-muted">Not in the invite list? </span>
          <a [routerLink]="['/event', event.id, 'register']" class="text-xs text-primary font-bold">
            Fill out the full registration form here →
          </a>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .rsvp-portal-wrapper {
      padding: 2.5rem 1.25rem 4rem;
    }
    .event-hero-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }
    .event-banner-img {
      height: 180px;
      position: relative;
      overflow: hidden;
      padding: 1rem;
      background-repeat: no-repeat;
      background-color: #111;
    }
    .banner-top-badge {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .category-pill {
      background: var(--flat-dark);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-pill);
      letter-spacing: 0.05em;
    }
    .hero-body {
      padding: 1.5rem 1.75rem;
    }
    .event-badge-label {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.08em;
    }
    .event-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0.25rem 0 0.4rem;
    }
    .event-schedule-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    @media (max-width: 640px) {
      .event-schedule-grid { grid-template-columns: 1fr; }
    }
    .schedule-box {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .s-icon { font-size: 1.25rem; }
    .s-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--flat-gray-500);
      text-transform: uppercase;
    }
    .s-val {
      font-size: 0.85rem;
      color: var(--flat-dark);
    }
    .match-item-card {
      padding: 0.85rem 1rem;
      border: 1.5px solid var(--flat-border);
      background: var(--flat-white);
      border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .match-item-card:hover {
      border-color: var(--flat-primary);
      background: var(--flat-primary-light);
    }
    .rsvp-options-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    @media (max-width: 640px) {
      .rsvp-options-grid { grid-template-columns: 1fr; }
    }
    .rsvp-card {
      border: 2px solid var(--flat-border);
      background: var(--flat-white);
      border-radius: var(--radius-md);
      padding: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rsvp-card input { display: none; }
    .rsvp-card.selected {
      border-color: var(--flat-primary);
      background: var(--flat-primary-light);
    }
    .rsvp-emoji { font-size: 1.5rem; }
    .text-2xs { font-size: 0.7rem; }
    .mt-6 { margin-top: 1.5rem; }
    .search-by-row { align-items: center; }
    .pill-btn {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--flat-border);
      background: var(--flat-gray-100);
      color: var(--flat-gray-600);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .pill-btn:hover {
      border-color: var(--flat-primary);
      color: var(--flat-primary);
    }
    .pill-btn.active {
      background: var(--flat-primary);
      border-color: var(--flat-primary);
      color: var(--flat-white);
    }
    .match-col-row {
      display: flex;
      gap: 0.35rem;
      align-items: baseline;
      line-height: 1.6;
    }
    .match-col-label {
      font-size: 0.72rem;
      color: var(--flat-gray-500);
      font-weight: 600;
      min-width: 48px;
    }
    .match-col-val {
      font-size: 0.9rem;
      color: var(--flat-dark);
      font-weight: 700;
    }
  `]
})
export class EventRsvpComponent implements OnInit {
  event?: Event;
  searchQuery = '';
  hasSearched = false;
  searchResults: Registration[] = [];
  selectedRegistration: Registration | null = null;
  selectedRsvp: RSVPStatus = 'attending';
  isSubmitting = false;

  /** Columns the organizer has mapped — shown as search-by pills */
  searchableColumns: Array<{ key: string; label: string; isCustom: boolean }> = [];
  /** Currently selected search field key; 'default' means name/email/ID */
  searchByKey = 'default';

  get searchPlaceholder(): string {
    if (this.searchByKey === 'default') return 'Enter your name, email, or registration ID...';
    const col = this.searchableColumns.find(c => c.key === this.searchByKey);
    return col ? `Enter your ${col.label.toLowerCase()}...` : 'Search...';
  }

  getColValue(reg: Registration, col: { key: string; isCustom: boolean }): string {
    if (col.isCustom) {
      const ans = reg.customAnswers?.find(a => a.questionId === col.key);
      return ans ? String(ans.answer ?? '') : '';
    }
    switch (col.key) {
      case 'firstName': return reg.firstName || '';
      case 'lastName':  return reg.lastName || '';
      case 'fullName':  return `${reg.firstName} ${reg.lastName}`.trim();
      case 'email':     return reg.email || '';
      case 'phone':     return reg.phone || '';
      case 'company':   return reg.company || '';
      case 'jobTitle':  return reg.jobTitle || '';
      default: {
        const ans = reg.customAnswers?.find(a => a.questionId === col.key);
        return ans ? String(ans.answer ?? '') : '';
      }
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.loadSearchableColumns(eventId);
    }
  }

  private loadSearchableColumns(eventId: string): void {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.mappingRows)) return;
      const cols = parsed.mappingRows
        .filter((r: any) => r.selectedHeader && r.selectedHeader.trim())
        .map((r: any) => ({ key: r.key, label: r.label, isCustom: !!r.isCustom }));
      this.searchableColumns = cols;
      // Pre-select the primary key column if configured, otherwise first column
      if (parsed.primaryKeyColumnKey) {
        this.searchByKey = parsed.primaryKeyColumnKey;
      } else if (cols.length > 0) {
        this.searchByKey = cols[0].key;
      }
    } catch {
      this.searchableColumns = [];
    }
  }

  searchAttendee(): void {
    if (!this.event) return;
    const q = this.searchQuery.trim().toLowerCase();
    this.hasSearched = true;

    const all = this.registrationService.getRegistrationsForEvent(this.event.id);

    if (!q) {
      this.searchResults = all;
      return;
    }

    this.searchResults = all.filter(r => {
      if (this.searchByKey === 'default') {
        const name = `${r.firstName} ${r.lastName}`.toLowerCase();
        const email = (r.email || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        // Also search customAnswers for name-like fields
        const customVals = (r.customAnswers || []).map(a => String(a.answer ?? '').toLowerCase());
        return name.includes(q) || email.includes(q) || id.includes(q) || customVals.some(v => v.includes(q));
      }

      // Specific column search
      const col = this.searchableColumns.find(c => c.key === this.searchByKey);
      if (!col) return false;

      if (col.isCustom) {
        const ans = r.customAnswers?.find(a => a.questionId === col.key);
        return String(ans?.answer ?? '').toLowerCase().includes(q);
      }

      // Standard field
      switch (col.key) {
        case 'firstName':  return (r.firstName || '').toLowerCase().includes(q);
        case 'lastName':   return (r.lastName || '').toLowerCase().includes(q);
        case 'fullName':   return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
        case 'email':      return (r.email || '').toLowerCase().includes(q);
        case 'phone':      return (r.phone || '').toLowerCase().includes(q);
        case 'company':    return (r.company || '').toLowerCase().includes(q);
        case 'jobTitle':   return (r.jobTitle || '').toLowerCase().includes(q);
        default: {
          const ans = r.customAnswers?.find(a => a.questionId === col.key);
          return String(ans?.answer ?? '').toLowerCase().includes(q);
        }
      }
    });
  }

  selectAttendee(reg: Registration): void {
    this.selectedRegistration = { ...reg };
    this.selectedRsvp = reg.rsvpStatus === 'pending' ? 'attending' : reg.rsvpStatus;
  }

  submitRsvpConfirmation(): void {
    if (!this.event || !this.selectedRegistration) return;

    this.isSubmitting = true;

    const updated = this.registrationService.updateRegistration(this.selectedRegistration.id, {
      rsvpStatus: this.selectedRsvp,
      email: this.selectedRegistration.email,
      dietaryPreferences: this.selectedRegistration.dietaryPreferences
    });

    this.isSubmitting = false;

    if (this.selectedRsvp === 'declined') {
      this.toastService.info('RSVP Recorded', 'Your response has been marked as Declined.');
    } else {
      this.toastService.success('RSVP Confirmed!', 'Your attendance pass is confirmed.');
    }

    this.router.navigate(['/event', this.event.id, 'confirmation', this.selectedRegistration.id]);
  }
}
