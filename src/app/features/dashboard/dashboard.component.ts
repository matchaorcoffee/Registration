import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Event, User } from '../../core/models/event.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatCardComponent, StatusBadgeComponent, ModalComponent],
  template: `
    <div class="dashboard-page container">
      <!-- Top Title & Quick Actions -->
      <div class="dashboard-header">
        <div>
          <span class="header-tag">ORGANIZER CONSOLE</span>
          <h1 class="page-title">Event Operations Hub</h1>
          <p class="text-muted">Manage active conferences, workshops, attendee check-in desks, and Excel imports.</p>
        </div>
        <div class="header-actions">
          <button (click)="openTemplateModal()" class="btn btn-secondary">
            📋 Use Template
          </button>
          <a routerLink="/events/create" class="btn btn-primary">
            + Create New Event
          </a>
        </div>
      </div>

      <!-- High-Level Metric Cards -->
      <div class="grid grid-cols-4 gap-4 stats-grid">
        <app-stat-card 
          label="Total Events" 
          [value]="events.length" 
          subtext="Active in platform" 
          icon="📅" 
          color="primary"
        ></app-stat-card>

        <app-stat-card 
          label="Upcoming Events" 
          [value]="upcomingCount" 
          subtext="Open for RSVP" 
          icon="🚀" 
          color="violet"
        ></app-stat-card>

        <app-stat-card 
          label="Total Registrations" 
          [value]="totalRegistrations" 
          subtext="Across all events" 
          icon="👥" 
          color="amber"
        ></app-stat-card>

        <app-stat-card 
          label="Checked In" 
          [value]="totalCheckedIn" 
          [subtext]="overallCheckInRate + '% attendance rate'" 
          icon="✓" 
          color="emerald"
          [progress]="overallCheckInRate"
        ></app-stat-card>
      </div>

      <!-- Event Cards Grid Section -->
      <div class="events-section">
        <div class="events-toolbar flex justify-between items-center">
          <div class="flex items-center gap-3">
            <h2 class="section-title">Your Events</h2>
            <span class="count-pill">{{ filteredEvents.length }}</span>
          </div>

          <!-- Category Filter Tabs -->
          <div class="filter-tabs">
            <button 
              *ngFor="let cat of categories" 
              (click)="selectedCategory = cat" 
              [class.active]="selectedCategory === cat"
              class="filter-tab"
            >
              {{ cat | titlecase }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6 event-cards-grid">
          <div *ngFor="let evt of filteredEvents" class="flat-event-card">
            <!-- Event Card Banner -->
            <div class="event-banner-wrap">
              <img class="banner-img-layer"
                [src]="evt.bannerUrl"
                [style.transform]="'translate(' + (evt.bannerOffsetX ?? 0) + 'px, ' + (evt.bannerOffsetY ?? 0) + 'px) scale(' + (evt.bannerZoom ?? 1) + ')'"
                alt="" aria-hidden="true" />
              <div class="banner-overlay">
                <app-status-badge [status]="evt.status"></app-status-badge>
                <span class="category-pill">{{ evt.category | uppercase }}</span>
              </div>
            </div>

            <!-- Event Card Content -->
            <div class="event-card-content">
              <div class="event-schedule">
                <span>🗓 {{ evt.date }}</span>
                <span>⏰ {{ evt.startTime }} - {{ evt.endTime }}</span>
              </div>

              <h3 class="event-card-title">{{ evt.name }}</h3>
              <p class="event-card-venue">📍 {{ evt.venue }}</p>

              <!-- Mini Capacity Meter -->
              <div class="event-capacity-box">
                <div class="flex justify-between text-xs">
                  <span class="font-bold">Registrations</span>
                  <span class="text-muted">
                    {{ getEventRegCount(evt.id) }} / {{ evt.capacity }}
                  </span>
                </div>
                <div class="progress-track">
                  <div 
                    class="progress-bar-fill" 
                    [style.width.%]="getCapacityPercent(evt.id, evt.capacity)"
                  ></div>
                </div>
              </div>

              <!-- Check-In Live Status Pill -->
              <div class="event-checkin-summary">
                <span class="checkin-badge">
                  ✓ {{ getEventCheckedInCount(evt.id) }} Checked In
                </span>
                <span class="rsvp-link-copy" (click)="copyShareLink(evt.id)" title="Copy Public RSVP Link">
                  🔗 Share URL
                </span>
              </div>

              <!-- Action Buttons -->
              <div class="event-card-actions">
                <a [routerLink]="['/events', evt.id]" class="btn btn-primary btn-sm btn-block">
                  Manage Hub →
                </a>
                <div class="flex gap-2">
                  <a [routerLink]="['/events', evt.id, 'check-in']" class="btn btn-emerald btn-sm" title="Open Check-in Terminal">
                    📷 Check-In
                  </a>
                  <a [routerLink]="['/events', evt.id, 'attendees']" class="btn btn-secondary btn-sm" title="Attendee List">
                    👥 Attendees
                  </a>
                  <button (click)="openDuplicateModal(evt)" class="btn btn-outline-dark btn-sm" title="Duplicate Event">
                    📋 Clone
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State When Organizer Has No Events -->
        <div *ngIf="filteredEvents.length === 0" class="flat-card text-center py-8">
          <div class="empty-icon text-3xl mb-2">📅</div>
          <h3 class="text-lg font-extrabold text-dark">No Events Found</h3>
          <p class="text-muted text-sm max-w-md mx-auto mt-1 mb-4">
            You don't have any events yet. Create your first event or start quickly from a ready-made template.
          </p>
          <div class="flex justify-center gap-3">
            <a routerLink="/events/create" class="btn btn-primary btn-sm">
              + Create Your First Event
            </a>
            <button (click)="openTemplateModal()" class="btn btn-secondary btn-sm">
              📋 Choose a Template
            </button>
          </div>
        </div>
      </div>

      <!-- Duplicate Event Modal -->
      <app-modal 
        [isOpen]="isDuplicateModalOpen" 
        [title]="'Duplicate Event Template'" 
        (close)="isDuplicateModalOpen = false"
      >
        <div class="modal-content-inner" *ngIf="targetDuplicateEvent">
          <p class="text-muted text-sm mb-3">
            Cloning <strong>{{ targetDuplicateEvent.name }}</strong> will copy event branding, description, venue, settings, and custom registration questions. 
            <br>
            <span class="text-coral font-bold">Attendees, registration IDs, and QR tokens will NOT be copied.</span>
          </p>

          <div class="form-group">
            <label class="form-label">New Event Name</label>
            <input 
              type="text" 
              class="form-control" 
              [(ngModel)]="duplicateNewName" 
              placeholder="e.g. {{ targetDuplicateEvent.name }} (Edition 2)" 
            />
          </div>
        </div>
        <div modal-footer>
          <button (click)="isDuplicateModalOpen = false" class="btn btn-secondary btn-sm">Cancel</button>
          <button (click)="confirmDuplicate()" class="btn btn-primary btn-sm">Duplicate & Open</button>
        </div>
      </app-modal>

      <!-- Predefined Template Modal -->
      <app-modal 
        [isOpen]="isTemplateModalOpen" 
        title="Create from Predefined Template" 
        maxWidth="640px"
        (close)="isTemplateModalOpen = false"
      >
        <div class="templates-grid">
          <div *ngFor="let t of predefinedTemplates" class="template-item-card" (click)="useTemplate(t)">
            <div class="template-icon">{{ t.icon }}</div>
            <div>
              <strong class="template-name">{{ t.name }}</strong>
              <p class="template-desc">{{ t.desc }}</p>
              <div class="template-tags">
                <span class="badge badge-gray">{{ t.category }}</span>
                <span class="badge badge-primary">{{ t.questionsCount }} custom questions</span>
              </div>
            </div>
          </div>
        </div>
        <div modal-footer>
          <button (click)="isTemplateModalOpen = false" class="btn btn-secondary btn-sm">Close</button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 2.5rem 1.25rem 4rem;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .header-tag {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--flat-primary);
    }
    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }
    .stats-grid {
      margin-bottom: 2.5rem;
    }
    .events-section {
      margin-top: 1.5rem;
    }
    .events-toolbar {
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .count-pill {
      background: var(--flat-gray-200);
      color: var(--flat-gray-800);
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-pill);
    }
    .filter-tabs {
      display: flex;
      background: var(--flat-gray-100);
      padding: 0.25rem;
      border-radius: var(--radius-md);
      gap: 0.25rem;
    }
    .filter-tab {
      background: none;
      border: none;
      padding: 0.4rem 0.85rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--flat-gray-600);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .filter-tab.active {
      background: var(--flat-white);
      color: var(--flat-dark);
      border: 1px solid var(--flat-border);
    }
    .flat-event-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
    }
    .flat-event-card:hover {
      border-color: var(--flat-primary);
    }
    .event-banner-wrap {
      height: 130px;
      position: relative;
      overflow: hidden;
    }
    .banner-img-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
      transform-origin: center center;
      z-index: 0;
    }
    .banner-overlay {
      position: relative;
      z-index: 1;
    }
    .banner-overlay {
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: linear-gradient(to bottom, rgba(15,23,42,0.6) 0%, transparent 100%);
    }
    .category-pill {
      background: rgba(15, 23, 42, 0.85);
      color: var(--flat-white);
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .event-card-content {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }
    .event-schedule {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--flat-primary);
    }
    .event-card-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.3;
    }
    .event-card-venue {
      font-size: 0.825rem;
      color: var(--flat-gray-600);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .event-capacity-box {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--flat-gray-200);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--flat-primary);
    }
    .event-checkin-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.775rem;
    }
    .checkin-badge {
      font-weight: 700;
      color: var(--flat-emerald-dark);
      background: var(--flat-emerald-light);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
    }
    .rsvp-link-copy {
      color: var(--flat-primary);
      font-weight: 700;
      cursor: pointer;
    }
    .rsvp-link-copy:hover {
      text-decoration: underline;
    }
    .event-card-actions {
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--flat-border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .templates-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .template-item-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .template-item-card:hover {
      border-color: var(--flat-primary);
      background-color: var(--flat-primary-light);
    }
    .template-icon {
      font-size: 1.75rem;
    }
    .template-name {
      font-size: 0.95rem;
      color: var(--flat-dark);
    }
    .template-desc {
      font-size: 0.8rem;
      color: var(--flat-gray-600);
      margin: 0.2rem 0 0.4rem;
    }
    .template-tags {
      display: flex;
      gap: 0.5rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  events: Event[] = [];
  categories = ['all', 'conference', 'workshop', 'celebration', 'seminar', 'webinar'];
  selectedCategory = 'all';

  isDuplicateModalOpen = false;
  targetDuplicateEvent: Event | null = null;
  duplicateNewName = '';

  isTemplateModalOpen = false;

  predefinedTemplates = [
    {
      name: 'Technology Conference 2026',
      category: 'conference',
      icon: '🎤',
      desc: 'Full-day tech summit with t-shirt size, dietary, track preferences, and parking questions.',
      questionsCount: 5
    },
    {
      name: 'Developer Workshop & BootCamp',
      category: 'workshop',
      icon: '💻',
      desc: 'Hands-on technical session with programming language selector and experience level questions.',
      questionsCount: 3
    },
    {
      name: 'Executive Networking Mixer',
      category: 'networking',
      icon: '🍸',
      desc: 'Evening VIP gathering with company, industry role, and beverage preference questions.',
      questionsCount: 2
    },
    {
      name: 'Company Townhall & Awards Gala',
      category: 'celebration',
      icon: '🏆',
      desc: 'Internal corporate celebration with dinner choice and plus-one attendance questions.',
      questionsCount: 3
    }
  ];

  currentUser: User | null = null;

  constructor(
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      this.loadEvents();
    });
  }

  loadEvents(): void {
    const orgId = this.currentUser?.id;
    this.events = this.eventService.getEvents(orgId);
  }

  get filteredEvents(): Event[] {
    if (this.selectedCategory === 'all') return this.events;
    return this.events.filter(e => e.category === this.selectedCategory);
  }

  get upcomingCount(): number {
    return this.events.filter(e => e.status === 'registration-open' || e.status === 'ongoing').length;
  }

  get totalRegistrations(): number {
    return this.events.reduce((sum, evt) => sum + this.getEventRegCount(evt.id), 0);
  }

  get totalCheckedIn(): number {
    return this.events.reduce((sum, evt) => sum + this.getEventCheckedInCount(evt.id), 0);
  }

  get overallCheckInRate(): number {
    const total = this.totalRegistrations;
    if (!total) return 0;
    return Math.round((this.totalCheckedIn / total) * 100);
  }

  getEventRegCount(eventId: string): number {
    return this.registrationService.getRegistrationsForEvent(eventId).length;
  }

  getEventCheckedInCount(eventId: string): number {
    return this.registrationService.getRegistrationsForEvent(eventId).filter(r => r.checkInStatus).length;
  }

  getCapacityPercent(eventId: string, capacity: number): number {
    if (!capacity) return 0;
    const count = this.getEventRegCount(eventId);
    return Math.min(100, Math.round((count / capacity) * 100));
  }

  copyShareLink(eventId: string): void {
    const origin = window.location.origin;
    const url = `${origin}/event/${eventId}/register`;
    navigator.clipboard.writeText(url);
    this.toastService.success('URL Copied', 'Public RSVP link copied to clipboard.');
  }

  openDuplicateModal(evt: Event): void {
    this.targetDuplicateEvent = evt;
    this.duplicateNewName = `${evt.name} (Copy)`;
    this.isDuplicateModalOpen = true;
  }

  confirmDuplicate(): void {
    if (!this.targetDuplicateEvent) return;
    const cloned = this.eventService.duplicateEvent(
      this.targetDuplicateEvent.id,
      this.duplicateNewName,
      this.currentUser?.id
    );
    this.isDuplicateModalOpen = false;
    if (cloned) {
      this.toastService.success('Event Duplicated', `Created "${cloned.name}". Attendees and QR tokens were NOT copied.`);
      this.loadEvents();
    }
  }

  openTemplateModal(): void {
    this.isTemplateModalOpen = true;
  }

  useTemplate(template: any): void {
    const user = this.currentUser;
    const newEvent = this.eventService.createEvent({
      name: template.name,
      tagline: template.desc,
      description: `Generated from ${template.name} template. Fully customizable for your attendees.`,
      category: template.category as any,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      badgeColor: '#2563eb',
      date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      venue: 'Metropolis Conference Hall',
      address: '100 Innovation Plaza, Suite 400',
      registrationDeadline: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
      capacity: 150,
      organizerId: user?.id || 'usr_org_001',
      organizerName: user?.name || 'Organizer',
      contactEmail: user?.email || 'organizer@evently.io',
      contactNumber: '+1 (555) 123-4567',
      isWalkInAllowed: true,
      isRsvpEnabled: true,
      confirmationMessage: 'Thank you for registering! Please save your QR pass.'
    }, [
      { id: '1', eventId: '', question: 'Dietary Preferences', type: 'dropdown', required: true, options: ['None / Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal'], order: 1 },
      { id: '2', eventId: '', question: 'Company or Organization', type: 'text', required: true, order: 2 },
      { id: '3', eventId: '', question: 'Do you require parking validation?', type: 'yes-no', required: false, order: 3 }
    ]);

    this.isTemplateModalOpen = false;
    this.toastService.success('Template Applied', `New event created from ${template.name}.`);
    this.loadEvents();
  }
}
