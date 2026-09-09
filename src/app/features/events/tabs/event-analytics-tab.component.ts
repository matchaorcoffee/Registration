import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { AnalyticsService, EventAnalytics } from '../../../core/services/analytics.service';
import { Event } from '../../../core/models/event.model';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-event-analytics-tab',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="analytics-tab-wrapper" *ngIf="event && stats">
      
      <!-- Top Metrics Overview -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <app-stat-card 
          label="Total Registrations" 
          [value]="stats.totalRegistrations" 
          subtext="Unified ingestion" 
          icon="👥" 
          color="primary"
        ></app-stat-card>

        <app-stat-card 
          label="Checked In" 
          [value]="stats.checkedInCount" 
          [subtext]="stats.attendanceRate + '% live attendance'" 
          icon="✓" 
          color="emerald"
          [progress]="stats.attendanceRate"
        ></app-stat-card>

        <app-stat-card 
          label="Not Checked In" 
          [value]="stats.notCheckedInCount" 
          subtext="Pending arrivals" 
          icon="⏳" 
          color="amber"
        ></app-stat-card>

        <app-stat-card 
          label="Capacity Filled" 
          [value]="capacityPercent + '%'" 
          [subtext]="stats.totalRegistrations + ' / ' + event.capacity" 
          icon="📈" 
          color="violet"
          [progress]="capacityPercent"
        ></app-stat-card>
      </div>

      <!-- Graphical Flat Charts Grid -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        
        <!-- 1. RSVP Response Breakdown (SVG Flat Donut) -->
        <div class="flat-card chart-card">
          <h3 class="chart-title">RSVP Decision Distribution</h3>
          <p class="text-xs text-muted mb-4">Breakdown of attendee attendance confirmations</p>

          <div class="donut-chart-container">
            <svg class="donut-svg" viewBox="0 0 160 160">
              <!-- Background Ring -->
              <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f1f5f9" stroke-width="24" />
              
              <!-- Attending Segment -->
              <circle 
                cx="80" cy="80" r="60" 
                fill="transparent" 
                stroke="#10b981" 
                stroke-width="24" 
                [attr.stroke-dasharray]="getDashArray(stats.attendingCount, stats.totalRegistrations)"
                stroke-dashoffset="0"
                transform="rotate(-90 80 80)"
              />

              <!-- Maybe Segment -->
              <circle 
                cx="80" cy="80" r="60" 
                fill="transparent" 
                stroke="#f59e0b" 
                stroke-width="24" 
                [attr.stroke-dasharray]="getDashArray(stats.maybeCount, stats.totalRegistrations)"
                [attr.stroke-dashoffset]="-getOffset(stats.attendingCount, stats.totalRegistrations)"
                transform="rotate(-90 80 80)"
              />

              <!-- Declined Segment -->
              <circle 
                cx="80" cy="80" r="60" 
                fill="transparent" 
                stroke="#ef4444" 
                stroke-width="24" 
                [attr.stroke-dasharray]="getDashArray(stats.declinedCount, stats.totalRegistrations)"
                [attr.stroke-dashoffset]="-getOffset(stats.attendingCount + stats.maybeCount, stats.totalRegistrations)"
                transform="rotate(-90 80 80)"
              />
            </svg>

            <div class="donut-center-text">
              <span class="donut-val">{{ stats.totalRegistrations }}</span>
              <span class="donut-lbl">Responses</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="chart-legend-grid mt-4">
            <div class="legend-item">
              <span class="legend-dot bg-emerald"></span>
              <span class="legend-name">Attending</span>
              <span class="legend-val font-bold">{{ stats.attendingCount }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot bg-amber"></span>
              <span class="legend-name">Maybe</span>
              <span class="legend-val font-bold">{{ stats.maybeCount }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot bg-coral"></span>
              <span class="legend-name">Declined</span>
              <span class="legend-val font-bold">{{ stats.declinedCount }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Registration Source & Check-In Performance (Flat Bars) -->
        <div class="flat-card chart-card">
          <h3 class="chart-title">Registration Channels & Check-In Velocity</h3>
          <p class="text-xs text-muted mb-4">Attendee origin and conversion to checked-in status</p>

          <div class="channel-bars-list">
            <!-- Online Form -->
            <div class="channel-bar-group">
              <div class="flex justify-between text-xs mb-1">
                <strong>🌐 Online RSVP Form ({{ stats.preRegisteredCount }})</strong>
                <span class="text-emerald font-bold">{{ stats.checkInRateBySource.formRate }}% Checked In</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bg-primary" [style.width.%]="stats.checkInRateBySource.formRate"></div>
              </div>
            </div>

            <!-- Excel Import -->
            <div class="channel-bar-group">
              <div class="flex justify-between text-xs mb-1">
                <strong>📊 Excel Spreadsheet Import ({{ stats.excelImportCount }})</strong>
                <span class="text-emerald font-bold">{{ stats.checkInRateBySource.excelRate }}% Checked In</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bg-indigo" [style.width.%]="stats.checkInRateBySource.excelRate"></div>
              </div>
            </div>

            <!-- Walk-In -->
            <div class="channel-bar-group">
              <div class="flex justify-between text-xs mb-1">
                <strong>⚡ On-Site Walk-In ({{ stats.walkInCount }})</strong>
                <span class="text-emerald font-bold">{{ stats.checkInRateBySource.walkInRate }}% Checked In</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bg-amber" [style.width.%]="stats.checkInRateBySource.walkInRate"></div>
              </div>
            </div>
          </div>

          <div class="source-stat-callout mt-6">
            <div class="flex items-center gap-2">
              <span class="callout-icon">💡</span>
              <p class="text-xs text-gray-700">
                Walk-in attendees achieve 100% check-in rate immediately due to automatic verification on arrival.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-Time Check-In Timeline Table -->
      <div class="flat-card">
        <h3 class="chart-title mb-1">Live Check-In Activity Stream</h3>
        <p class="text-xs text-muted mb-4">Latest validated attendee arrivals recorded by check-in station operators</p>

        <div class="flat-table-container">
          <table class="flat-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Registration ID</th>
                <th>Channel</th>
                <th>Check-In Operator</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of stats.recentCheckIns">
                <td>
                  <strong>{{ item.firstName }} {{ item.lastName }}</strong>
                  <div class="text-xs text-muted">{{ item.company || 'Guest' }}</div>
                </td>
                <td class="font-mono text-xs">{{ item.id }}</td>
                <td><span class="badge badge-primary">{{ item.registrationSource }}</span></td>
                <td class="text-xs">{{ item.checkedInBy || 'Staff Desk' }}</td>
                <td class="font-mono text-xs text-emerald font-bold">{{ formatDateTime(item.checkInTime) }}</td>
              </tr>
              <tr *ngIf="stats.recentCheckIns.length === 0">
                <td colspan="5" class="text-center py-6 text-muted">
                  No check-ins recorded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-tab-wrapper {
      display: flex;
      flex-direction: column;
    }
    .chart-card {
      padding: 1.5rem;
    }
    .chart-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .donut-chart-container {
      position: relative;
      width: 180px;
      height: 180px;
      margin: 0 auto;
    }
    .donut-svg {
      width: 100%;
      height: 100%;
    }
    .donut-center-text {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .donut-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1;
    }
    .donut-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--flat-gray-500);
      text-transform: uppercase;
    }
    .chart-legend-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      border-top: 1px solid var(--flat-border);
      padding-top: 1rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .bg-emerald { background: var(--flat-emerald); }
    .bg-amber { background: var(--flat-amber); }
    .bg-coral { background: var(--flat-coral); }
    .bg-primary { background: var(--flat-primary); }
    .bg-indigo { background: var(--flat-indigo); }
    .channel-bars-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .bar-track {
      width: 100%;
      height: 12px;
      background: var(--flat-gray-100);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      transition: width 0.4s ease;
    }
    .source-stat-callout {
      background: var(--flat-gray-50);
      border: 1px dashed var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
    }
    .callout-icon { font-size: 1.2rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .py-6 { padding: 1.5rem 0; }
  `]
})
export class EventAnalyticsTabComponent implements OnInit {
  event?: Event;
  stats?: EventAnalytics;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.parent?.snapshot.paramMap.get('id');
    if (eventId) {
      this.event = this.eventService.getEventById(eventId);
      this.loadAnalytics(eventId);
    }
  }

  loadAnalytics(eventId: string): void {
    const regs = this.registrationService.getRegistrationsForEvent(eventId);
    this.stats = this.analyticsService.calculateAnalytics(regs, this.event?.capacity || 0);
  }

  get capacityPercent(): number {
    if (!this.event || !this.event.capacity || !this.stats) return 0;
    return Math.min(100, Math.round((this.stats.totalRegistrations / this.event.capacity) * 100));
  }

  getDashArray(count: number, total: number): string {
    const circ = 2 * Math.PI * 60; // r=60
    if (!total || !count) return `0 ${circ}`;
    const portion = (count / total) * circ;
    return `${portion} ${circ}`;
  }

  getOffset(prevSum: number, total: number): number {
    const circ = 2 * Math.PI * 60;
    if (!total || !prevSum) return 0;
    return (prevSum / total) * circ;
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}
