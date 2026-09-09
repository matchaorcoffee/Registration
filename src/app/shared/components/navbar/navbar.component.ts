import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="flat-navbar">
      <div class="container flex items-center justify-between">
        <a routerLink="/" class="brand-logo">
          <div class="brand-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/>
              <path d="m9 16 2 2 4-4"/>
            </svg>
          </div>
          <span class="brand-text">Evently</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">Home</a>
          <a routerLink="/registration" routerLinkActive="active" class="nav-item">Find My RSVP</a>
          
          <ng-container *ngIf="authService.currentUser$ | async as user; else guestLinks">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">Dashboard</a>
            <a routerLink="/events/create" routerLinkActive="active" class="nav-item">+ New Event</a>
            
            <div class="user-profile-menu">
              <div class="user-avatar" title="{{ user.name }} ({{ user.organization }})">
                {{ user.name.charAt(0) }}
              </div>
              <button (click)="authService.logout()" class="btn btn-sm btn-outline-dark" title="Logout">
                Sign Out
              </button>
            </div>
          </ng-container>

          <ng-template #guestLinks>
            <a routerLink="/login" class="nav-item">Sign In</a>
            <a routerLink="/signup" class="btn btn-sm btn-primary">
              Sign Up Free
            </a>
          </ng-template>
        </nav>

        <!-- Mobile Quick Actions -->
        <div class="mobile-actions">
          <a routerLink="/registration" class="btn btn-sm btn-secondary">Find RSVP</a>
          <ng-container *ngIf="authService.currentUser$ | async; else mobileLogin">
            <a routerLink="/dashboard" class="btn btn-sm btn-primary">Dashboard</a>
          </ng-container>
          <ng-template #mobileLogin>
            <a routerLink="/signup" class="btn btn-sm btn-primary">Sign Up</a>
          </ng-template>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .flat-navbar {
      background-color: var(--flat-white);
      border-bottom: 2px solid var(--flat-border);
      padding: 0.75rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
    }
    .brand-badge {
      background-color: var(--flat-primary);
      color: var(--flat-white);
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-text {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .nav-item {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--flat-gray-600);
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }
    .nav-item:hover, .nav-item.active {
      color: var(--flat-primary);
      background-color: var(--flat-primary-light);
    }
    .user-profile-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: 0.5rem;
      padding-left: 1rem;
      border-left: 1px solid var(--flat-border);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      background-color: var(--flat-primary);
      color: var(--flat-white);
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mobile-actions {
      display: none;
      gap: 0.5rem;
    }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .mobile-actions { display: flex; }
    }
  `]
})
export class NavbarComponent {
  constructor(public authService: AuthService) {}
}
