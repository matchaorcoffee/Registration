import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { Event, Registration } from '../../../core/models/event.model';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { RsvpBadgeComponent } from '../../../shared/components/rsvp-badge/rsvp-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-event-overview-tab',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, RsvpBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="overview-tab" *ngIf="event">
      <!-- Quick Action Bar -->
      <div class="quick-actions-bar flat-card">
        <div class="flex items-center gap-3">
          <span class="action-bar-label">Event Day Actions:</span>
          <a [routerLink]="['/events', event.id, 'check-in']" class="btn btn-emerald">
            📷 Open QR Check-In Terminal
          </a>
          <a [routerLink]="['/events', event.id, 'import']" class="btn btn-secondary">
            📁 Import Excel Attendees
          </a>
          <a [routerLink]="['/event', event.id, 'rsvp']" target="_blank" class="btn btn-primary">
            🔗 Attendee RSVP Portal
          </a>
          <a [routerLink]="['/event', event.id, 'register']" target="_blank" class="btn btn-outline">
            ↗ Public Registration Page
          </a>
        </div>
      </div>

      <!-- Stat Cards Grid -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <app-stat-card 
          label="Total RSVP" 
          [value]="registrations.length" 
          [subtext]="event.capacity ? 'Cap: ' + event.capacity : ''" 
          icon="👥" 
          color="primary"
        ></app-stat-card>

        <app-stat-card 
          label="Checked In" 
          [value]="checkedInCount" 
          [subtext]="attendanceRate + '% attendance rate'" 
          icon="✓" 
          color="emerald"
          [progress]="attendanceRate"
        ></app-stat-card>

        <app-stat-card 
          label="Attending (RSVP)" 
          [value]="attendingCount" 
          subtext="Confirmed guests" 
          icon="⭐" 
          color="amber"
        ></app-stat-card>

        <app-stat-card 
          label="Walk-Ins" 
          [value]="walkInCount" 
          subtext="Registered on-site" 
          icon="⚡" 
          color="violet"
        ></app-stat-card>
      </div>

      <!-- Two-Column Layout (Recent Check-Ins & Source Breakdown) -->
      <div class="grid grid-cols-2 gap-6">
        <!-- Recent Check-Ins Stream -->
        <div class="flat-card">
          <div class="card-title-row flex justify-between items-center mb-4">
            <h3 class="card-heading">Recent Check-Ins</h3>
            <a [routerLink]="['/events', event.id, 'attendees']" class="text-sm font-bold text-primary">View All →</a>
          </div>

          <div class="recent-list" *ngIf="recentCheckIns.length > 0; else noRecentCheckIns">
            <div *ngFor="let reg of recentCheckIns" class="recent-item">
              <div class="recent-avatar">✓</div>
              <div class="recent-info">
                <strong>{{ reg.firstName }} {{ reg.lastName }}</strong>
                <p class="text-xs text-muted">{{ reg.company || 'Attendee' }} • {{ reg.jobTitle || 'Guest' }}</p>
              </div>
              <div class="recent-time text-xs font-mono text-emerald">
                {{ formatTime(reg.checkInTime) }}
              </div>
            </div>
          </div>

          <ng-template #noRecentCheckIns>
            <div class="empty-feed">
              <p>No check-ins recorded yet today. Open the <strong>Check-In Terminal</strong> to scan incoming attendee QR codes.</p>
            </div>
          </ng-template>
        </div>

        <!-- Ingestion Channel Summary -->
        <div class="flat-card">
          <h3 class="card-heading mb-4">Unified Registration Breakdown</h3>
          
          <div class="channel-stats-list">
            <div class="channel-row">
              <div class="channel-label">
                <span class="badge badge-primary">Form</span>
                <span>Online Public RSVPs</span>
              </div>
              <span class="channel-val font-mono font-bold">{{ formCount }}</span>
            </div>

            <div class="channel-row">
              <div class="channel-label">
                <span class="badge badge-indigo">Excel</span>
                <span>Imported Spreadsheet Guests</span>
              </div>
              <span class="channel-val font-mono font-bold">{{ importedCount }}</span>
            </div>

            <div class="channel-row">
              <div class="channel-label">
                <span class="badge badge-amber">Walk-In</span>
                <span>On-Site Walk-In Registrations</span>
              </div>
              <span class="channel-val font-mono font-bold">{{ walkInCount }}</span>
            </div>
          </div>

          <!-- Description / Venue Details -->
          <div class="event-desc-box mt-6">
            <h4 class="text-xs font-bold text-muted uppercase mb-2">Event Information</h4>
            <p class="text-sm text-gray-700 leading-relaxed">{{ event.description }}</p>
            <div class="mt-3 text-xs text-muted">
              <strong>Registration Deadline:</strong> {{ event.registrationDeadline }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overview-tab {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .quick-actions-bar {
      padding: 1rem 1.25rem;
      background: var(--flat-white);
    }
    .action-bar-label {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--flat-gray-700);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-heading {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .recent-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      background: var(--flat-gray-50);
      border-radius: var(--radius-md);
      border: 1px solid var(--flat-border);
    }
    .recent-avatar {
      width: 28px;
      height: 28px;
      background: var(--flat-emerald);
      color: var(--flat-white);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
    }
    .recent-info {
      flex: 1;
    }
    .recent-info strong {
      font-size: 0.875rem;
      color: var(--flat-dark);
    }
    .channel-stats-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .channel-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
    }
    .channel-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--flat-gray-700);
    }
    .event-desc-box {
      background: var(--flat-gray-50);
      padding: 1rem;
      border-radius: var(--radius-md);
      border: 1px dashed var(--flat-border);
    }
    .empty-feed {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--flat-gray-500);
      font-size: 0.875rem;
    }
    .mt-6 { margin-top: 1.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-3 { margin-top: 0.75rem; }
  `]
})
export class EventOverviewTabComponent implements OnInit {
  event?: Event;
  registrations: Registration[] = [];

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private registrationService: RegistrationService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.parent?.snapshot.paramMap.get('id');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.loadRegistrations(eventId);
    }
  }

  loadRegistrations(eventId: string): void {
    this.registrations = this.registrationService.getRegistrationsForEvent(eventId);
  }

  get checkedInCount(): number {
    return this.registrations.filter(r => r.checkInStatus).length;
  }

  get attendingCount(): number {
    return this.registrations.filter(r => r.rsvpStatus === 'attending').length;
  }

  get walkInCount(): number {
    return this.registrations.filter(r => r.registrationType === 'walk-in').length;
  }

  get formCount(): number {
    return this.registrations.filter(r => r.registrationSource === 'form').length;
  }

  get importedCount(): number {
    return this.registrations.filter(r => r.registrationSource === 'excel-import').length;
  }

  get attendanceRate(): number {
    if (!this.registrations.length) return 0;
    return Math.round((this.checkedInCount / this.registrations.length) * 100);
  }

  get recentCheckIns(): Registration[] {
    return this.registrations
      .filter(r => r.checkInStatus && r.checkInTime)
      .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())
      .slice(0, 5);
  }

  formatTime(isoString?: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
