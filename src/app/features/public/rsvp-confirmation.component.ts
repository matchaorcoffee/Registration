import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { Event, Registration } from '../../core/models/event.model';
import { QrDisplayComponent } from '../../shared/components/qr-display/qr-display.component';
import { RsvpBadgeComponent } from '../../shared/components/rsvp-badge/rsvp-badge.component';

@Component({
  selector: 'app-rsvp-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, QrDisplayComponent, RsvpBadgeComponent],
  template: `
    <div class="confirmation-wrapper" *ngIf="registration && event">
      <div class="container container-narrow">
        
        <!-- Success Banner -->
        <div class="success-top-card">
          <div class="confetti-icon">{{ registration.rsvpStatus === 'declined' ? '✉️' : '🎉' }}</div>
          <h1 class="conf-title">{{ registration.rsvpStatus === 'declined' ? 'RSVP Received' : "You're Registered!" }}</h1>
          <p class="conf-sub">
            {{ registration.rsvpStatus === 'declined'
              ? 'Your response has been recorded. We are sorry you cannot make it!'
              : 'Your attendance pass and digital QR code have been confirmed.' }}
          </p>
        </div>

        <!-- Two-Column Pass Card (Mobile Responsive) -->
        <div class="pass-ticket-card" [class.declined-card]="registration.rsvpStatus === 'declined'">
          <div class="ticket-left">
            <div class="ticket-header">
              <span class="ticket-org-tag" [class.declined-tag]="registration.rsvpStatus === 'declined'">
                {{ registration.rsvpStatus === 'declined' ? 'RSVP RECORD' : 'EVENT PASS' }}
              </span>
              <app-rsvp-badge [status]="registration.rsvpStatus"></app-rsvp-badge>
            </div>

            <h2 class="ticket-event-name">{{ event.name }}</h2>
            
            <div class="ticket-guest-info">
              <span class="t-label">ATTENDEE NAME</span>
              <strong class="t-val">{{ registration.firstName }} {{ registration.lastName }}</strong>
              <span class="t-sub" *ngIf="registration.jobTitle || registration.company">
                {{ registration.jobTitle }} • {{ registration.company }}
              </span>
            </div>

            <div class="ticket-grid">
              <div class="t-box">
                <span class="t-label">REGISTRATION ID</span>
                <strong class="t-code font-mono">{{ registration.id }}</strong>
              </div>
              <div class="t-box">
                <span class="t-label">DATE & TIME</span>
                <span class="t-val-sm">{{ event.date }} ({{ event.startTime }})</span>
              </div>
            </div>

            <div class="ticket-venue-box">
              <span class="t-label">VENUE & ADDRESS</span>
              <span class="t-val-sm font-bold">{{ event.venue }}</span>
              <p class="text-xs text-muted">{{ event.address }}</p>
            </div>

            <!-- Custom Answers Summary if present -->
            <div *ngIf="registration.customAnswers && registration.customAnswers.length" class="custom-answers-summary">
              <span class="t-label">EVENT CHOICES</span>
              <div *ngFor="let ans of registration.customAnswers" class="ans-pill">
                <strong>{{ ans.questionText }}:</strong> {{ formatAnswer(ans.answer) }}
              </div>
            </div>

          </div>

          <!-- Ticket Right / QR Side (shown when not declined AND QR is enabled) -->
          <div class="ticket-right" *ngIf="registration.rsvpStatus !== 'declined' && event.isQrEnabled !== false">
            <div class="qr-heading">Scan at Event Check-In</div>
            
            <app-qr-display
              [token]="registration.qrToken"
              [guestName]="registration.firstName + ' ' + registration.lastName"
              [regId]="registration.id"
              [showActions]="true"
            ></app-qr-display>

            <p class="qr-footnote text-xs text-muted mt-3">
              Present this digital pass or save it to your phone album. Staff will scan it at entry.
            </p>
          </div>

          <!-- No QR Pass — organizer disabled QR -->
          <div class="ticket-right ticket-declined-side" *ngIf="registration.rsvpStatus !== 'declined' && event.isQrEnabled === false">
            <div class="declined-icon">🎟️</div>
            <h3 class="font-extrabold text-lg mt-2" style="color:#1f2328;">Registration Confirmed</h3>
            <p class="text-xs text-muted mt-2 max-w-xs">
              This event uses <strong>manual check-in</strong>. No QR pass is required — staff will locate your name on the guest list.
            </p>
          </div>

          <!-- Declined Notice Right Side -->
          <div class="ticket-right ticket-declined-side" *ngIf="registration.rsvpStatus === 'declined'">
            <div class="declined-icon">✕</div>
            <h3 class="font-extrabold text-coral-dark text-lg mt-2">No QR Pass Issued</h3>
            <p class="text-xs text-muted mt-2 max-w-xs">
              Since your RSVP is marked as <strong>Declined</strong>, no check-in QR pass is generated for this event.
            </p>
            <div class="mt-4">
              <a [routerLink]="['/event', event.id, 'rsvp']" class="btn btn-secondary btn-sm">
                Change RSVP Response
              </a>
            </div>
          </div>
        </div>

        <!-- Navigation bottom with options to Register or Find Name -->
        <div class="text-center mt-6 flex justify-center gap-3 flex-wrap">
          <a [routerLink]="['/event', event.id, 'register']" class="btn btn-primary btn-sm">
            ➕ Register as Guest
          </a>
          <a [routerLink]="['/event', event.id, 'rsvp']" class="btn btn-secondary btn-sm">
            🔍 Find My Name on Guest List (RSVP)
          </a>
          <a routerLink="/registration" class="btn btn-outline-dark btn-sm">
            🎫 Lookup My QR Pass
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-wrapper {
      padding: 3rem 1.25rem 4rem;
    }
    .success-top-card {
      text-align: center;
      margin-bottom: 2rem;
    }
    .confetti-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .conf-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .conf-sub {
      color: var(--flat-gray-600);
      font-size: 1.05rem;
      margin-top: 0.25rem;
    }
    .pass-ticket-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      display: grid;
      grid-template-columns: 1.25fr 0.75fr;
      overflow: hidden;
    }
    @media (max-width: 800px) {
      .pass-ticket-card { grid-template-columns: 1fr; }
      .ticket-right { border-left: none !important; border-top: 2px dashed var(--flat-border); }
    }
    .ticket-left {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ticket-org-tag {
      background: var(--flat-primary);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .ticket-event-name {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.25;
    }
    .ticket-guest-info {
      display: flex;
      flex-direction: column;
    }
    .t-label {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--flat-gray-500);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .t-val {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .t-sub {
      font-size: 0.825rem;
      color: var(--flat-gray-600);
    }
    .ticket-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      background: var(--flat-gray-50);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--flat-border);
    }
    .t-code {
      font-size: 0.95rem;
      color: var(--flat-primary);
    }
    .t-val-sm {
      font-size: 0.85rem;
      color: var(--flat-gray-800);
    }
    .ticket-venue-box {
      background: var(--flat-gray-50);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--flat-border);
    }
    .custom-answers-summary {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ans-pill {
      font-size: 0.775rem;
      background: var(--flat-gray-100);
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-sm);
      color: var(--flat-gray-700);
    }
    .ticket-footer-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 1rem;
    }
    .ticket-right {
      background: var(--flat-gray-50);
      border-left: 2px dashed var(--flat-border);
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .ticket-declined-side {
      background: #fff8f8;
      border-left: 2px dashed #fca5a5;
    }
    .declined-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--flat-coral-light);
      color: var(--flat-coral-dark);
      border: 2px solid var(--flat-coral);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 800;
    }
    .declined-tag {
      background: var(--flat-coral) !important;
    }
    .declined-card {
      border-color: #fca5a5 !important;
    }
    .text-coral-dark {
      color: var(--flat-coral-dark);
    }
    .max-w-xs {
      max-width: 20rem;
    }
    .qr-heading {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--flat-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .qr-footnote {
      max-width: 260px;
    }
    .mt-6 { margin-top: 1.5rem; }
    .mt-3 { margin-top: 0.75rem; }
  `]
})
export class RsvpConfirmationComponent implements OnInit {
  registration?: Registration;
  event?: Event;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    const regId = this.route.snapshot.paramMap.get('regId');

    if (eventId && regId) {
      this.event = this.eventService.getEventById(eventId);
      this.registration = this.registrationService.getRegistrationById(regId);

      if (!this.registration || !this.event) {
        this.toastService.error('Not Found', 'Registration record not located.');
        this.router.navigate(['/']);
      }
    }
  }

  formatAnswer(val: any): string {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  downloadCalendarIcs(): void {
    if (!this.event || !this.registration) return;

    const startDateStr = this.event.date.replace(/-/g, '') + 'T' + this.event.startTime.replace(/:/g, '') + '00';
    const endDateStr = this.event.date.replace(/-/g, '') + 'T' + this.event.endTime.replace(/:/g, '') + '00';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Evently//Event Registration Platform//EN',
      'BEGIN:VEVENT',
      `UID:${this.registration.id}@evently.io`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `SUMMARY:${this.event.name}`,
      `DESCRIPTION:Your registration ID: ${this.registration.id}\\nVenue: ${this.event.venue}`,
      `LOCATION:${this.event.venue}, ${this.event.address}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${this.event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    link.click();

    this.toastService.success('Calendar Invite', 'Event .ics file downloaded.');
  }
}
