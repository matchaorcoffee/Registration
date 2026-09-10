import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { CheckInService } from '../../core/services/checkin.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Event, Registration, User } from '../../core/models/event.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RsvpBadgeComponent } from '../../shared/components/rsvp-badge/rsvp-badge.component';
import { QrDisplayComponent } from '../../shared/components/qr-display/qr-display.component';

interface ConfirmState {
  step: 'lookup' | 'confirm' | 'walkin' | 'success';
  query: string;
  results: Registration[];
  searched: boolean;
  selected: Registration | null;
  confirmed: Registration | null;
  confirming: boolean;
  wiData: { name: string; email: string; company: string };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatCardComponent, StatusBadgeComponent, ModalComponent, RsvpBadgeComponent, QrDisplayComponent],
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

      <!-- Event List with Inline Attendance Confirmation -->
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
            >{{ cat | titlecase }}</button>
          </div>
        </div>

        <!-- Each event row -->
        <div *ngFor="let evt of filteredEvents" class="event-confirm-row">

          <!-- ── Top: Event summary bar ── -->
          <div class="ecr-summary">
            <div class="ecr-banner"
              [style.backgroundImage]="'url(' + evt.bannerUrl + ')'"
              [style.backgroundSize]="evt.bannerImgW ? (evt.bannerImgW + 'px ' + evt.bannerImgH + 'px') : 'contain'"
              [style.backgroundPosition]="evt.bannerImgW ? (evt.bannerOffsetX + 'px ' + evt.bannerOffsetY + 'px') : 'center'"
            >
              <div class="ecr-banner-overlay">
                <app-status-badge [status]="evt.status"></app-status-badge>
                <span class="category-pill">{{ evt.category | uppercase }}</span>
              </div>
            </div>

            <div class="ecr-info">
              <div class="ecr-meta">
                <span>🗓 {{ evt.date }}</span>
                <span>⏰ {{ evt.startTime }} – {{ evt.endTime }}</span>
                <span>📍 {{ evt.venue }}</span>
              </div>
              <h3 class="ecr-title">{{ evt.name }}</h3>
              <div class="ecr-stats">
                <span class="checkin-badge">✓ {{ getEventCheckedInCount(evt.id) }} Checked In</span>
                <span class="text-xs text-muted">{{ getEventRegCount(evt.id) }} / {{ evt.capacity }} registered</span>
              </div>
            </div>

            <div class="ecr-actions">
              <a [routerLink]="['/events', evt.id]" class="btn btn-primary btn-sm">Manage →</a>
              <a [routerLink]="['/events', evt.id, 'check-in']" class="btn btn-emerald btn-sm" *ngIf="evt.isQrEnabled !== false">📷 QR Check-In</a>
              <a [routerLink]="['/events', evt.id, 'attendees']" class="btn btn-secondary btn-sm">👥 Attendees</a>
              <button (click)="openDuplicateModal(evt)" class="btn btn-outline-dark btn-sm">📋 Clone</button>
              <span class="rsvp-link-copy" (click)="copyShareLink(evt.id)">🔗 Share URL</span>
            </div>
          </div>

          <!-- ── Bottom: Inline Attendance Confirmation ── -->
          <div class="ecr-confirm-panel">
            <div class="ecp-header">
              <span class="ecp-label">✅ Attendance Confirmation Kiosk</span>
              <span class="text-xs text-muted">Search an existing registration to confirm attendance{{ evt.isWalkInAllowed ? ', or register a walk-in.' : '.' }}</span>
            </div>

            <!-- Search bar -->
            <ng-container *ngIf="getConfirmState(evt.id).step === 'lookup'">
              <form (ngSubmit)="doSearch(evt.id)" class="ecp-search-row">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  [(ngModel)]="getConfirmState(evt.id).query"
                  [name]="'q_' + evt.id"
                  placeholder="Name, Email, or Registration ID…"
                />
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="!getConfirmState(evt.id).query.trim()">🔍 Find</button>
                <button *ngIf="evt.isWalkInAllowed" type="button" class="btn btn-walkin-sm btn-sm" (click)="getConfirmState(evt.id).step = 'walkin'; resetWalkInState(evt.id)">⚡ Walk-In</button>
              </form>

              <!-- No results -->
              <p *ngIf="getConfirmState(evt.id).searched && getConfirmState(evt.id).results.length === 0"
                class="text-xs text-coral mt-2">No registrations found. Try a different query.</p>

              <!-- Results -->
              <div *ngIf="getConfirmState(evt.id).results.length > 0" class="ecp-results">
                <div
                  *ngFor="let r of getConfirmState(evt.id).results"
                  class="ecp-result-row"
                  (click)="selectForConfirm(evt.id, r)"
                >
                  <div>
                    <strong class="text-sm">{{ r.firstName }} {{ r.lastName }}</strong>
                    <span class="text-xs text-muted ml-2">{{ r.email }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-rsvp-badge [status]="r.rsvpStatus"></app-rsvp-badge>
                    <span class="text-xs text-primary font-bold">Select →</span>
                  </div>
                </div>
              </div>
            </ng-container>

            <!-- Confirm step -->
            <ng-container *ngIf="getConfirmState(evt.id).step === 'confirm' && getConfirmState(evt.id).selected">
              <div class="ecp-confirm-block">
                <div class="ecp-reg-detail">
                  <span class="font-mono text-xs text-primary">{{ getConfirmState(evt.id).selected!.id }}</span>
                  <strong class="ml-2">{{ getConfirmState(evt.id).selected!.firstName }} {{ getConfirmState(evt.id).selected!.lastName }}</strong>
                  <span class="text-xs text-muted ml-2">{{ getConfirmState(evt.id).selected!.email }}</span>
                  <app-rsvp-badge [status]="getConfirmState(evt.id).selected!.rsvpStatus" class="ml-2"></app-rsvp-badge>
                </div>
                <div class="flex gap-2 mt-2">
                  <button class="btn btn-emerald btn-sm" (click)="confirmAttendance(evt.id)" [disabled]="getConfirmState(evt.id).confirming">
                    {{ getConfirmState(evt.id).confirming ? 'Confirming…' : '✅ Confirm Attending' }}
                  </button>
                  <button class="btn btn-secondary btn-sm" (click)="resetConfirmState(evt.id)">← Back</button>
                </div>
              </div>
            </ng-container>

            <!-- Walk-In step -->
            <ng-container *ngIf="getConfirmState(evt.id).step === 'walkin'">
              <form (ngSubmit)="submitWalkIn(evt.id)" #wiForm="ngForm" class="ecp-walkin-form">
                <div class="ecp-walkin-fields">
                  <div class="form-group mb-0">
                    <label class="form-label text-xs">Full Name *</label>
                    <input type="text" class="form-control form-control-sm"
                      [(ngModel)]="getConfirmState(evt.id).wiData.name" name="wi_name" required placeholder="Jane Doe" />
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-xs">Email *</label>
                    <input type="email" class="form-control form-control-sm"
                      [(ngModel)]="getConfirmState(evt.id).wiData.email" name="wi_email" required placeholder="jane@co.com" />
                  </div>
                  <div class="form-group mb-0">
                    <label class="form-label text-xs">Organization</label>
                    <input type="text" class="form-control form-control-sm"
                      [(ngModel)]="getConfirmState(evt.id).wiData.company" name="wi_company" placeholder="Optional" />
                  </div>
                </div>
                <div class="flex gap-2 mt-2">
                  <button type="submit" class="btn btn-emerald btn-sm" [disabled]="wiForm.invalid || getConfirmState(evt.id).confirming">
                    {{ getConfirmState(evt.id).confirming ? 'Registering…' : '⚡ Register & Check In' }}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="resetConfirmState(evt.id)">Cancel</button>
                </div>
              </form>
            </ng-container>

            <!-- Success step -->
            <ng-container *ngIf="getConfirmState(evt.id).step === 'success' && getConfirmState(evt.id).confirmed">
              <div class="ecp-success-block">
                <div class="ecp-success-badge">✓</div>
                <div class="ecp-success-info">
                  <strong>{{ getConfirmState(evt.id).confirmed!.firstName }} {{ getConfirmState(evt.id).confirmed!.lastName }}</strong>
                  <span class="font-mono text-xs text-primary ml-2">{{ getConfirmState(evt.id).confirmed!.id }}</span>
                  <span class="badge badge-emerald ml-2">CONFIRMED ATTENDING</span>
                </div>
                <!-- Mini QR if enabled -->
                <div *ngIf="evt.isQrEnabled !== false && getConfirmState(evt.id).confirmed!.qrToken" class="ecp-qr-mini">
                  <app-qr-display
                    [token]="getConfirmState(evt.id).confirmed!.qrToken"
                    [guestName]="getConfirmState(evt.id).confirmed!.firstName + ' ' + getConfirmState(evt.id).confirmed!.lastName"
                    [regId]="getConfirmState(evt.id).confirmed!.id"
                    [showActions]="true"
                  ></app-qr-display>
                </div>
                <button class="btn btn-secondary btn-sm mt-2" (click)="resetConfirmState(evt.id)">Next Guest</button>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredEvents.length === 0" class="flat-card text-center py-8">
          <div class="empty-icon text-3xl mb-2">📅</div>
          <h3 class="text-lg font-extrabold text-dark">No Events Found</h3>
          <p class="text-muted text-sm max-w-md mx-auto mt-1 mb-4">
            You don't have any events yet. Create your first event or start quickly from a ready-made template.
          </p>
          <div class="flex justify-center gap-3">
            <a routerLink="/events/create" class="btn btn-primary btn-sm">+ Create Your First Event</a>
            <button (click)="openTemplateModal()" class="btn btn-secondary btn-sm">📋 Choose a Template</button>
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
      background-repeat: no-repeat;
      background-color: #111;
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
    /* ── Event Confirm Row ── */
    .event-confirm-row {
      background: var(--flat-white);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 1.25rem;
    }
    .ecr-summary {
      display: flex;
      gap: 0;
      align-items: stretch;
      border-bottom: 1px solid var(--flat-border);
    }
    .ecr-banner {
      width: 140px;
      min-height: 100px;
      flex-shrink: 0;
      background-color: #111;
      background-repeat: no-repeat;
    }
    .ecr-banner-overlay {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      background: linear-gradient(to bottom, rgba(15,23,42,0.55) 0%, transparent 100%);
      height: 100%;
    }
    .ecr-info {
      flex: 1;
      padding: 0.85rem 1rem;
      min-width: 0;
    }
    .ecr-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--flat-primary);
      margin-bottom: 0.3rem;
      flex-wrap: wrap;
    }
    .ecr-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin-bottom: 0.35rem;
    }
    .ecr-stats {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.775rem;
    }
    .ecr-actions {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.85rem 1rem;
      border-left: 1px solid var(--flat-border);
      min-width: 170px;
    }
    /* ── Confirm Panel ── */
    .ecr-confirm-panel {
      padding: 0.85rem 1.1rem;
      background: var(--flat-gray-50);
    }
    .ecp-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.65rem;
      flex-wrap: wrap;
    }
    .ecp-label {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--flat-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ecp-search-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .ecp-search-row input {
      flex: 1;
    }
    .ecp-results {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 200px;
      overflow-y: auto;
    }
    .ecp-result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: var(--flat-white);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .ecp-result-row:hover {
      border-color: var(--flat-primary);
      background: var(--flat-primary-light);
    }
    .ecp-confirm-block {
      background: var(--flat-white);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
    }
    .ecp-reg-detail {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.875rem;
    }
    .ecp-walkin-form {
      background: var(--flat-white);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
    }
    .ecp-walkin-fields {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.65rem;
      margin-bottom: 0.5rem;
    }
    .ecp-success-block {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      background: var(--flat-emerald-light);
      border: 1px solid var(--flat-emerald);
      border-radius: var(--radius-md);
      padding: 0.65rem 1rem;
    }
    .ecp-success-badge {
      width: 32px;
      height: 32px;
      background: var(--flat-emerald);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .ecp-success-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.875rem;
    }
    .ecp-qr-mini {
      margin-left: auto;
    }
    .btn-walkin-sm {
      background: var(--flat-violet);
      color: #fff;
      border: none;
    }
    .btn-walkin-sm:hover {
      background: var(--flat-indigo);
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

  confirmStates: Record<string, ConfirmState> = {};

  constructor(
    private eventService: EventService,
    private registrationService: RegistrationService,
    private checkInService: CheckInService,
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

  getConfirmState(eventId: string): ConfirmState {
    if (!this.confirmStates[eventId]) {
      this.confirmStates[eventId] = {
        step: 'lookup',
        query: '',
        results: [],
        searched: false,
        selected: null,
        confirmed: null,
        confirming: false,
        wiData: { name: '', email: '', company: '' }
      };
    }
    return this.confirmStates[eventId];
  }

  doSearch(eventId: string): void {
    const state = this.getConfirmState(eventId);
    const q = state.query.trim().toLowerCase();
    if (!q) return;
    state.results = this.registrationService.lookupRegistration(q, eventId);
    state.searched = true;
  }

  selectForConfirm(eventId: string, reg: Registration): void {
    const state = this.getConfirmState(eventId);
    state.selected = reg;
    state.step = 'confirm';
  }

  confirmAttendance(eventId: string): void {
    const state = this.getConfirmState(eventId);
    if (!state.selected) return;
    state.confirming = true;
    const result = this.checkInService.verifyAndCheckIn(state.selected.id, eventId, 'Organizer (Kiosk)');
    state.confirming = false;
    if (result.status === 'success' || result.status === 'already-checked-in') {
      state.confirmed = result.registration || state.selected;
      state.step = 'success';
      if (result.status === 'success') {
        this.toastService.success('Attendance Confirmed', `${state.confirmed.firstName} ${state.confirmed.lastName} is checked in.`);
      } else {
        this.toastService.success('Already Checked In', `${state.confirmed.firstName} ${state.confirmed.lastName} was already checked in.`);
      }
    } else {
      this.toastService.error('Check-In Failed', result.message);
    }
  }

  resetConfirmState(eventId: string): void {
    this.confirmStates[eventId] = {
      step: 'lookup',
      query: '',
      results: [],
      searched: false,
      selected: null,
      confirmed: null,
      confirming: false,
      wiData: { name: '', email: '', company: '' }
    };
  }

  resetWalkInState(eventId: string): void {
    const state = this.getConfirmState(eventId);
    state.wiData = { name: '', email: '', company: '' };
  }

  submitWalkIn(eventId: string): void {
    const state = this.getConfirmState(eventId);
    const { name, email, company } = state.wiData;
    if (!name.trim() || !email.trim()) return;
    const parts = name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '-';
    state.confirming = true;
    const reg = this.registrationService.registerWalkIn({
      eventId,
      firstName,
      lastName,
      email: email.trim(),
      company: company.trim() || undefined,
      checkedInBy: 'Organizer (Walk-In Kiosk)'
    });
    state.confirming = false;
    state.confirmed = reg;
    state.step = 'success';
    this.toastService.success('Walk-In Registered', `${reg.firstName} ${reg.lastName} has been registered and checked in.`);
    this.loadEvents();
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
      isQrEnabled: true,
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
