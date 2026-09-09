import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="flat-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="flex items-center gap-2">
              <div class="brand-badge-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect width="18" height="18" x="3" y="4" rx="2"/>
                  <path d="M3 10h18"/>
                </svg>
              </div>
              <span class="brand-name">Evently</span>
            </div>
            <p class="footer-desc">One registration platform for all your events. Online RSVP, Excel attendee import, and instant QR check-in.</p>
          </div>

          <div class="footer-links-group">
            <div class="links-column">
              <h4>Platform</h4>
              <a routerLink="/dashboard">Organizer Dashboard</a>
              <a routerLink="/signup">Organizer Sign Up</a>
              <a routerLink="/login">Organizer Sign In</a>
              <a routerLink="/registration">Find RSVP / Pass</a>
            </div>
            <div class="links-column">
              <h4>Demo Resources</h4>
              <button (click)="resetDemoData()" class="text-button">
                ↻ Reset Demo Dataset
              </button>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 Evently Platform Inc. Built with Angular & Flat Design principles.</p>
          <div class="flex gap-3 text-muted text-sm">
            <span>Unified Attendee DB</span>
            <span>•</span>
            <span>Zero-PII QR Tokens</span>
            <span>•</span>
            <span>Instant Mobile Check-In</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .flat-footer {
      background-color: var(--flat-gray-800);
      color: var(--flat-gray-300);
      border-top: 3px solid var(--flat-gray-700);
      padding: 3rem 0 1.5rem;
      margin-top: 4rem;
      font-size: 0.875rem;
    }
    .footer-top {
      display: flex;
      justify-content: space-between;
      gap: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--flat-gray-700);
    }
    .footer-brand {
      max-width: 360px;
    }
    .brand-badge-sm {
      background-color: var(--flat-primary);
      color: var(--flat-white);
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--flat-white);
    }
    .footer-desc {
      margin-top: 0.75rem;
      line-height: 1.6;
      color: var(--flat-gray-400);
    }
    .footer-links-group {
      display: flex;
      gap: 3rem;
    }
    .links-column h4 {
      color: var(--flat-white);
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.85rem;
    }
    .links-column a, .text-button {
      display: block;
      color: var(--flat-gray-400);
      margin-bottom: 0.5rem;
      text-decoration: none;
      background: none;
      border: none;
      padding: 0;
      font-size: inherit;
      cursor: pointer;
      text-align: left;
    }
    .links-column a:hover, .text-button:hover {
      color: var(--flat-primary-light);
    }
    .footer-bottom {
      padding-top: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--flat-gray-500);
    }
    @media (max-width: 768px) {
      .footer-top {
        flex-direction: column;
      }
      .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class FooterComponent {
  constructor(
    private storageService: StorageService,
    private toastService: ToastService
  ) {}

  resetDemoData(): void {
    if (confirm('Reset demo database to fresh realistic event state?')) {
      this.storageService.resetToDefaultDemoData();
      this.toastService.success('Reset Complete', 'Demo events and attendees reloaded.');
      setTimeout(() => window.location.reload(), 500);
    }
  }
}
