import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { AuthService } from '../../core/services/auth.service';
import { Event } from '../../core/models/event.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <div class="hero-grid">
            <div class="hero-content">
              <div class="hero-tag">
                <span class="tag-badge">FLAT ARCHITECTURE</span>
                <span>One platform for all your events</span>
              </div>
              <h1 class="hero-title">
                Event Registration, RSVP & <span class="highlight">Instant QR Check-In</span>
              </h1>
              <p class="hero-subtitle">
                The all-in-one event operations platform. Unify Online RSVPs, Excel spreadsheet attendee imports, and on-site Walk-In registrations into a single real-time attendee database with zero-friction check-ins.
              </p>
              
              <div class="hero-actions">
                <ng-container *ngIf="!authService.isAuthenticated">
                  <a routerLink="/signup" class="btn btn-lg btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    Get Started Free
                  </a>
                  <a routerLink="/login" class="btn btn-lg btn-secondary">
                    Organizer Sign In
                  </a>
                </ng-container>
                <a routerLink="/registration" class="btn btn-lg btn-outline-dark">
                  Find RSVP Pass
                </a>
              </div>

              <!-- Quick Workflow Stepper -->
              <div class="workflow-strip">
                <div class="flow-step">
                  <div class="step-num">1</div>
                  <span>Create</span>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                  <div class="step-num">2</div>
                  <span>RSVP</span>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                  <div class="step-num">3</div>
                  <span>Import</span>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                  <div class="step-num">4</div>
                  <span>QR Pass</span>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                  <div class="step-num">5</div>
                  <span>Check In</span>
                </div>
              </div>
            </div>

            <!-- Hero Interactive Preview Card -->
            <div class="hero-preview">
              <div class="flat-preview-card">
                <div class="card-header-bar">
                  <div class="window-dots">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                  </div>
                  <span class="window-title">Evently Fast Check-In Terminal</span>
                </div>
                <div class="card-body">
                  <div class="terminal-status-success">
                    <div class="status-icon">✓</div>
                    <div>
                      <strong>CHECK-IN SUCCESSFUL</strong>
                      <p>Jane Doe • Principal Architect</p>
                    </div>
                  </div>

                  <div class="terminal-stats-row">
                    <div class="term-stat">
                      <span class="label">Total RSVP</span>
                      <span class="val">400</span>
                    </div>
                    <div class="term-stat">
                      <span class="label">Checked In</span>
                      <span class="val text-emerald">267</span>
                    </div>
                    <div class="term-stat">
                      <span class="label">Live Rate</span>
                      <span class="val text-primary">89%</span>
                    </div>
                  </div>

                  <div class="terminal-actions">
                    <button class="term-btn term-btn-qr">
                      📷 SCAN QR PASS
                    </button>
                    <button class="term-btn term-btn-walkin">
                      + WALK-IN GUEST
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3 Channels Section -->
      <section class="channels-section">
        <div class="container">
          <div class="section-heading">
            <span class="section-tag">UNIFIED INGESTION</span>
            <h2>Three Entry Channels. One Database.</h2>
            <p>Every attendee is assigned a unique registration ID and secure QR token, regardless of how they join.</p>
          </div>

          <div class="grid grid-cols-3 gap-6">
            <div class="flat-channel-card border-blue">
              <div class="channel-icon icon-blue">🌐</div>
              <h3>1. Online RSVP</h3>
              <p>Guests RSVP through custom branded mobile forms with custom question validation and instant pass downloads.</p>
              <div class="channel-footer">
                <span class="badge badge-primary">Form Source</span>
              </div>
            </div>

            <div class="flat-channel-card border-indigo">
              <div class="channel-icon icon-indigo">📊</div>
              <h3>2. Excel Import</h3>
              <p>Upload .xlsx spreadsheets, intelligently auto-map varied columns, preview duplicate alerts, and batch-create QR passes.</p>
              <div class="channel-footer">
                <span class="badge badge-indigo">Excel Source</span>
              </div>
            </div>

            <div class="flat-channel-card border-amber">
              <div class="channel-icon icon-amber">⚡</div>
              <h3>3. Walk-In Registration</h3>
              <p>Register unannounced event arrivals with a rapid 30-second form that automatically marks them checked in on creation.</p>
              <div class="channel-footer">
                <span class="badge badge-amber">Walk-In Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Live Demo Events Showcase -->
      <section class="demo-events-section">
        <div class="container">
          <div class="section-heading flex justify-between items-center">
            <div>
              <span class="section-tag">EXPLORE SAMPLE EVENTS</span>
              <h2>Active Events Ready to Test</h2>
            </div>
            <a routerLink="/dashboard" class="btn btn-secondary">Go to Organizer Hub →</a>
          </div>

          <div class="grid grid-cols-3 gap-6">
            <div *ngFor="let evt of events" class="event-demo-card">
              <div class="event-demo-img" [style.backgroundImage]="'url(' + evt.bannerUrl + ')'">
                <app-status-badge [status]="evt.status"></app-status-badge>
              </div>
              <div class="event-demo-body">
                <div class="event-meta">
                  <span class="event-date">📅 {{ evt.date }}</span>
                  <span class="event-venue">📍 {{ evt.venue.split('-')[0] }}</span>
                </div>
                <h4 class="event-name">{{ evt.name }}</h4>
                <p class="event-tagline">{{ evt.tagline || evt.description }}</p>

                <div class="event-actions">
                  <a [routerLink]="['/event', evt.id, 'register']" class="btn btn-sm btn-primary">
                    RSVP as Guest
                  </a>
                  <a [routerLink]="['/events', evt.id]" class="btn btn-sm btn-outline">
                    Manage Event
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .landing-page {
      padding-bottom: 3rem;
    }
    .hero-section {
      padding: 4.5rem 0 3.5rem;
      background-color: var(--flat-white);
      border-bottom: 2px solid var(--flat-border);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3rem;
      align-items: center;
    }
    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--flat-gray-600);
      margin-bottom: 1.25rem;
    }
    .tag-badge {
      background: var(--flat-primary);
      color: var(--flat-white);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      letter-spacing: 0.05em;
    }
    .hero-title {
      font-size: 2.75rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 1.25rem;
    }
    .hero-title .highlight {
      color: var(--flat-primary);
    }
    .hero-subtitle {
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--flat-gray-600);
      margin-bottom: 2rem;
      max-width: 580px;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 2.5rem;
    }
    .workflow-strip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--flat-border);
      flex-wrap: wrap;
    }
    .flow-step {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--flat-gray-700);
    }
    .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--flat-gray-200);
      color: var(--flat-gray-800);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
    }
    .flow-arrow {
      color: var(--flat-gray-400);
      font-size: 0.9rem;
    }

    /* Hero Preview Terminal */
    .flat-preview-card {
      background: var(--flat-dark);
      border: 3px solid var(--flat-gray-800);
      border-radius: var(--radius-xl);
      overflow: hidden;
      color: var(--flat-white);
    }
    .card-header-bar {
      background: var(--flat-gray-800);
      padding: 0.65rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid var(--flat-gray-700);
    }
    .window-dots {
      display: flex;
      gap: 0.35rem;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot.red { background: var(--flat-coral); }
    .dot.yellow { background: var(--flat-amber); }
    .dot.green { background: var(--flat-emerald); }
    .window-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--flat-gray-400);
      font-family: var(--font-mono);
    }
    .card-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .terminal-status-success {
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid var(--flat-emerald);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .status-icon {
      background: var(--flat-emerald);
      color: var(--flat-white);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
    }
    .terminal-stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      background: var(--flat-gray-800);
      padding: 0.85rem;
      border-radius: var(--radius-md);
      text-align: center;
    }
    .term-stat .label {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--flat-gray-400);
      display: block;
      text-transform: uppercase;
    }
    .term-stat .val {
      font-size: 1.35rem;
      font-weight: 800;
    }
    .terminal-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .term-btn {
      padding: 0.85rem;
      font-weight: 800;
      font-size: 0.85rem;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
    }
    .term-btn-qr {
      background: var(--flat-primary);
      color: var(--flat-white);
    }
    .term-btn-walkin {
      background: var(--flat-amber);
      color: var(--flat-dark);
    }

    /* Channels Section */
    .channels-section {
      padding: 4rem 0;
    }
    .section-heading {
      margin-bottom: 2.5rem;
    }
    .section-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.4rem;
    }
    .section-heading h2 {
      font-size: 1.95rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .section-heading p {
      color: var(--flat-gray-600);
      margin-top: 0.35rem;
      font-size: 1rem;
    }
    .flat-channel-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .flat-channel-card.border-blue { border-top: 4px solid var(--flat-primary); }
    .flat-channel-card.border-indigo { border-top: 4px solid var(--flat-indigo); }
    .flat-channel-card.border-amber { border-top: 4px solid var(--flat-amber); }
    .channel-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .icon-blue { background: var(--flat-primary-light); }
    .icon-indigo { background: var(--flat-indigo-light); }
    .icon-amber { background: var(--flat-amber-light); }
    .flat-channel-card h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .flat-channel-card p {
      font-size: 0.9rem;
      color: var(--flat-gray-600);
      line-height: 1.5;
      flex: 1;
    }
    .channel-footer {
      padding-top: 0.5rem;
    }

    /* Demo Events */
    .demo-events-section {
      padding: 3rem 0;
      background: var(--flat-gray-50);
      border-top: 2px solid var(--flat-border);
      border-bottom: 2px solid var(--flat-border);
    }
    .event-demo-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .event-demo-img {
      height: 140px;
      background-size: cover;
      background-position: center;
      padding: 0.85rem;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
    }
    .event-demo-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      flex: 1;
    }
    .event-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--flat-gray-500);
      font-weight: 600;
    }
    .event-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.3;
    }
    .event-tagline {
      font-size: 0.825rem;
      color: var(--flat-gray-600);
      line-height: 1.4;
      flex: 1;
    }
    .event-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.5rem;
    }

    @media (max-width: 900px) {
      .hero-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class LandingComponent implements OnInit {
  events: Event[] = [];

  constructor(private eventService: EventService, public authService: AuthService) {}

  ngOnInit(): void {
    this.events = this.eventService.getEvents().slice(0, 3);
  }
}
