import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { Event } from '../../core/models/event.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive, StatusBadgeComponent],
  template: `
    <div class="event-detail-page container" *ngIf="event">
      <!-- Breadcrumb & Top Bar -->
      <div class="detail-breadcrumb flex justify-between items-center">
        <a routerLink="/dashboard" class="back-link">← Back to All Events</a>
        <div class="flex gap-2">
          <a [routerLink]="['/event', event.id, 'register']" target="_blank" class="btn btn-sm btn-outline">
            ↗ Public RSVP Page
          </a>
          <button (click)="copyShareLink()" class="btn btn-sm btn-secondary">
            🔗 Copy Share Link
          </button>
        </div>
      </div>

      <!-- Hero Header Banner -->
      <div class="event-hero-card">
        <div class="event-hero-img"
          [style.backgroundImage]="'url(' + event.bannerUrl + ')'"
          [style.backgroundSize]="event.bannerImgW ? (event.bannerImgW + 'px ' + event.bannerImgH + 'px') : 'contain'"
          [style.backgroundPosition]="event.bannerImgW ? (event.bannerOffsetX + 'px ' + event.bannerOffsetY + 'px') : 'center'"
        >
          <div class="hero-top-badges">
            <app-status-badge [status]="event.status"></app-status-badge>
            <span class="category-tag">{{ event.category | uppercase }}</span>
          </div>
        </div>

        <div class="event-hero-body">
          <div class="hero-main-info">
            <h1 class="event-hero-title">{{ event.name }}</h1>
            <p class="event-hero-tagline" *ngIf="event.tagline">{{ event.tagline }}</p>

            <div class="event-details-chips">
              <div class="chip">🗓 <strong>{{ event.date }}</strong> ({{ event.startTime }} - {{ event.endTime }})</div>
              <div class="chip">📍 <strong>{{ event.venue }}</strong>, {{ event.address }}</div>
              <div class="chip">👤 Organizer: <strong>{{ event.organizerName }}</strong></div>
            </div>
          </div>

          <!-- Quick Metrics in Header -->
          <div class="hero-metrics-box">
            <div class="metric-item">
              <span class="m-label">Registered</span>
              <span class="m-val text-primary">{{ registrationsCount }} / {{ event.capacity }}</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="m-label">Checked In</span>
              <span class="m-val text-emerald">{{ checkedInCount }}</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="m-label">Capacity</span>
              <span class="m-val">{{ capacityPercent }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Navigation Navigation Bar -->
      <div class="event-tabs-nav">
        <a [routerLink]="['/events', event.id]" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="active" class="tab-item">
          📊 Overview
        </a>
        <a [routerLink]="['/events', event.id, 'attendees']" routerLinkActive="active" class="tab-item">
          👥 Attendees ({{ registrationsCount }})
        </a>
        <a *ngIf="event.isQrEnabled !== false" [routerLink]="['/events', event.id, 'check-in']" routerLinkActive="active" class="tab-item highlight-tab">
          📷 Fast QR Check-In
        </a>
        <a [routerLink]="['/events', event.id, 'import']" routerLinkActive="active" class="tab-item">
          📁 Import Excel
        </a>
        <a [routerLink]="['/events', event.id, 'analytics']" routerLinkActive="active" class="tab-item">
          📈 Analytics
        </a>
        <a [routerLink]="['/events', event.id, 'edit']" routerLinkActive="active" class="tab-item">
          ⚙️ Settings & Edit
        </a>
      </div>

      <!-- Routed Tab Content -->
      <div class="tab-content-view">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .event-detail-page {
      padding: 2rem 1.25rem 4rem;
    }
    .detail-breadcrumb {
      margin-bottom: 1.25rem;
    }
    .back-link {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--flat-primary);
    }
    .event-hero-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .event-hero-img {
      height: 180px;
      position: relative;
      overflow: hidden;
      padding: 1rem 1.25rem;
      background-repeat: no-repeat;
      background-color: #111;
    }
    .hero-top-badges {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-tag {
      background: var(--flat-dark);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .event-hero-body {
      padding: 1.5rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .hero-main-info {
      flex: 1;
      min-width: 300px;
    }
    .event-hero-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.2;
    }
    .event-hero-tagline {
      font-size: 0.95rem;
      color: var(--flat-gray-600);
      margin-top: 0.35rem;
    }
    .event-details-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .chip {
      background: var(--flat-gray-100);
      border: 1px solid var(--flat-border);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-pill);
      font-size: 0.8rem;
      color: var(--flat-gray-700);
    }
    .hero-metrics-box {
      display: flex;
      align-items: center;
      background: var(--flat-gray-50);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1rem 1.5rem;
      gap: 1.5rem;
    }
    .metric-item {
      text-align: center;
    }
    .m-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--flat-gray-500);
    }
    .m-val {
      font-size: 1.35rem;
      font-weight: 800;
      line-height: 1.2;
    }
    .metric-divider {
      width: 1px;
      height: 36px;
      background: var(--flat-border);
    }
    .event-tabs-nav {
      display: flex;
      gap: 0.35rem;
      border-bottom: 2px solid var(--flat-border);
      margin-bottom: 2rem;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .tab-item {
      padding: 0.75rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--flat-gray-600);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      white-space: nowrap;
      transition: all 0.15s ease;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
    }
    .tab-item:hover {
      color: var(--flat-primary);
      background-color: var(--flat-primary-light);
    }
    .tab-item.active {
      color: var(--flat-primary);
      border-bottom-color: var(--flat-primary);
      background: var(--flat-white);
    }
    .tab-item.highlight-tab {
      color: var(--flat-emerald-dark);
      background-color: var(--flat-emerald-light);
    }
    .tab-item.highlight-tab.active {
      border-bottom-color: var(--flat-emerald);
      color: var(--flat-emerald-dark);
    }
    .tab-content-view {
      min-height: 400px;
    }
  `]
})
export class EventDetailComponent implements OnInit {
  event?: Event;
  registrationsCount = 0;
  checkedInCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadEvent(id);
      }
    });

    this.registrationService.registrations$.subscribe(() => {
      if (this.event) {
        this.updateStats(this.event.id);
      }
    });
  }

  loadEvent(id: string): void {
    this.event = this.eventService.getEventById(id);
    if (!this.event) {
      this.toastService.error('Not Found', 'Event does not exist.');
      this.router.navigate(['/dashboard']);
      return;
    }
    this.updateStats(id);
  }

  updateStats(eventId: string): void {
    const regs = this.registrationService.getRegistrationsForEvent(eventId);
    this.registrationsCount = regs.length;
    this.checkedInCount = regs.filter(r => r.checkInStatus).length;
  }

  get capacityPercent(): number {
    if (!this.event || !this.event.capacity) return 0;
    return Math.min(100, Math.round((this.registrationsCount / this.event.capacity) * 100));
  }

  copyShareLink(): void {
    if (!this.event) return;
    const url = `${window.location.origin}/event/${this.event.id}/register`;
    navigator.clipboard.writeText(url);
    this.toastService.success('URL Copied', 'Public RSVP URL copied to clipboard.');
  }
}
