import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RegistrationService } from '../../core/services/registration.service';
import { EventService } from '../../core/services/event.service';
import { ToastService } from '../../core/services/toast.service';
import { Registration, Event } from '../../core/models/event.model';
import { QrDisplayComponent } from '../../shared/components/qr-display/qr-display.component';
import { RsvpBadgeComponent } from '../../shared/components/rsvp-badge/rsvp-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-registration-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QrDisplayComponent, RsvpBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="lookup-wrapper container container-narrow">
      <div class="lookup-header text-center">
        <span class="lookup-tag">ATTENDEE SELF-SERVICE</span>
        <h1 class="page-title">Find My Registration</h1>
        <p class="text-muted">Enter your registered email address or Registration ID (e.g. EVT-2026-000101) to retrieve your registration details.</p>
      </div>

      <!-- Search Card -->
      <div class="search-card flat-card">
        <form (ngSubmit)="onSearch()" class="search-form">
          <div class="form-group mb-0 flex-1">
            <label class="form-label">Email or Registration ID</label>
            <input 
              type="text" 
              class="form-control form-control-lg" 
              [(ngModel)]="searchQuery" 
              name="searchQuery" 
              placeholder="e.g. sarah.connor@cyberdyne.org or EVT-2026-000101"
              required 
            />
          </div>
          <button type="submit" [disabled]="!searchQuery.trim() || isSearching" class="btn btn-primary btn-lg search-btn">
            🔍 Retrieve Pass
          </button>
        </form>

        <!-- Quick Demo Query Pills -->
        <div class="quick-examples mt-3 flex items-center gap-2">
          <span class="text-xs font-bold text-gray-500">Try sample:</span>
          <button type="button" (click)="searchQuery = 'sarah.connor@cyberdyne.org'; onSearch()" class="pill-btn">
            sarah.connor&#64;cyberdyne.org
          </button>
          <button type="button" (click)="searchQuery = 'EVT-2026-000102'; onSearch()" class="pill-btn">
            EVT-2026-000102
          </button>
        </div>
      </div>

      <!-- Results Section -->
      <div *ngIf="hasSearched" class="results-container mt-6">
        <div *ngIf="foundRegistrations.length > 0; else noResults">
          <h3 class="results-heading">Matching Passes ({{ foundRegistrations.length }})</h3>

          <div *ngFor="let reg of foundRegistrations" class="reg-result-card flat-card">
            <div class="result-top flex justify-between items-start">
              <div>
                <span class="reg-id-badge font-mono">{{ reg.id }}</span>
                <h3 class="reg-guest-name">{{ reg.firstName }} {{ reg.lastName }}</h3>
                <p class="text-sm text-muted">{{ reg.email }} • {{ reg.company || 'Attendee' }}</p>
              </div>

              <div class="flex flex-col items-end gap-1">
                <app-rsvp-badge [status]="reg.rsvpStatus"></app-rsvp-badge>
                <app-status-badge [checkedIn]="reg.checkInStatus"></app-status-badge>
              </div>
            </div>

            <!-- Event Details -->
            <div class="result-event-box" *ngIf="getEvent(reg.eventId) as evt">
              <strong class="evt-title">{{ evt.name }}</strong>
              <div class="evt-meta-row flex gap-4 text-xs text-gray-600 mt-1">
                <span>🗓 {{ evt.date }} ({{ evt.startTime }})</span>
                <span>📍 {{ evt.venue }}</span>
              </div>
            </div>

            <!-- Check-In Info if Checked In -->
            <div *ngIf="reg.checkInStatus" class="checkin-notice">
              ✓ Checked in at event on <strong>{{ formatDateTime(reg.checkInTime) }}</strong>
            </div>

            <!-- QR Code Pass (Only when QR is enabled for the event and token exists) -->
            <div class="qr-embed-area mt-4" *ngIf="reg.rsvpStatus !== 'declined' && reg.qrToken && isQrEnabled(reg.eventId)">
              <app-qr-display
                [token]="reg.qrToken"
                [guestName]="reg.firstName + ' ' + reg.lastName"
                [regId]="reg.id"
                [showActions]="true"
              ></app-qr-display>
            </div>

            <!-- No QR pass message when QR is disabled -->
            <div class="p-4 bg-gray-50 border rounded-lg text-center mt-4" *ngIf="reg.rsvpStatus !== 'declined' && !isQrEnabled(reg.eventId)">
              <span class="text-gray-600 font-bold text-sm">✓ Registration Confirmed</span>
              <p class="text-xs text-muted mt-1">Present this registration ID at the event entrance for manual check-in.</p>
            </div>

            <div class="p-4 bg-coral-light border rounded-lg text-center mt-4" *ngIf="reg.rsvpStatus === 'declined'">
              <span class="text-coral-dark font-bold text-sm">✕ RSVP Status: Declined</span>
              <p class="text-xs text-muted mt-1">No QR check-in pass generated for declined invitations.</p>
            </div>
          </div>
        </div>

        <ng-template #noResults>
          <div class="empty-state-card flat-card text-center">
            <div class="empty-icon">🔍</div>
            <h3>No Registrations Found</h3>
            <p class="text-muted text-sm">We couldn't find any registrations matching "{{ searchQuery }}". Please check the spelling or contact the organizer.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .lookup-wrapper {
      padding: 3rem 1.25rem 5rem;
    }
    .lookup-header {
      margin-bottom: 2rem;
    }
    .lookup-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.08em;
    }
    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .search-card {
      border: 2px solid var(--flat-dark);
    }
    .search-form {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
    }
    @media (max-width: 640px) {
      .search-form { flex-direction: column; align-items: stretch; }
    }
    .flex-1 { flex: 1; }
    .search-btn {
      white-space: nowrap;
    }
    .pill-btn {
      background: var(--flat-gray-100);
      border: 1px solid var(--flat-border);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--flat-primary);
      cursor: pointer;
    }
    .pill-btn:hover {
      background: var(--flat-primary-light);
    }
    .results-heading {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin-bottom: 1rem;
    }
    .reg-result-card {
      border: 2px solid var(--flat-border);
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .reg-id-badge {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--flat-primary);
    }
    .reg-guest-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .result-event-box {
      background: var(--flat-gray-50);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--flat-border);
    }
    .evt-title {
      font-size: 0.95rem;
      color: var(--flat-dark);
    }
    .checkin-notice {
      background: var(--flat-emerald-light);
      color: var(--flat-emerald-dark);
      padding: 0.6rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
    }
    .empty-state-card {
      padding: 3rem 1.5rem;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mb-0 { margin-bottom: 0; }
  `]
})
export class RegistrationLookupComponent {
  searchQuery = '';
  hasSearched = false;
  isSearching = false;
  foundRegistrations: Registration[] = [];

  constructor(
    private registrationService: RegistrationService,
    private eventService: EventService,
    private toastService: ToastService
  ) {}

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.isSearching = true;
    this.hasSearched = true;

    setTimeout(() => {
      this.foundRegistrations = this.registrationService.lookupRegistration(q);
      this.isSearching = false;
      if (this.foundRegistrations.length > 0) {
        this.toastService.success('Found', `Located ${this.foundRegistrations.length} pass record(s).`);
      } else {
        this.toastService.warning('Not Found', 'No registrations match your search.');
      }
    }, 250);
  }

  getEvent(eventId: string): Event | undefined {
    return this.eventService.getEventById(eventId);
  }

  isQrEnabled(eventId: string): boolean {
    const evt = this.eventService.getEventById(eventId);
    return evt?.isQrEnabled !== false;
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}
