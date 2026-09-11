import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public Routes
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'registration',
    loadComponent: () => import('./features/public/registration-lookup.component').then(m => m.RegistrationLookupComponent)
  },
  {
    path: 'event/:eventId/register',
    loadComponent: () => import('./features/public/public-registration.component').then(m => m.PublicRegistrationComponent)
  },
  {
    path: 'event/:eventId/rsvp',
    loadComponent: () => import('./features/public/event-rsvp.component').then(m => m.EventRsvpComponent)
  },
  {
    path: 'event/:eventId/confirmation/:regId',
    loadComponent: () => import('./features/public/rsvp-confirmation.component').then(m => m.RsvpConfirmationComponent)
  },
  {
    path: 'event/:eventId/confirm',
    loadComponent: () => import('./features/public/attendance-confirmation.component').then(m => m.AttendanceConfirmationComponent)
  },
  {
    path: 'event/:eventId/scan',
    loadComponent: () => import('./features/public/attendance-scan.component').then(m => m.AttendanceScanComponent)
  },

  // Organizer Protected Routes
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'events/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/events/event-form.component').then(m => m.EventFormComponent)
  },
  {
    path: 'events/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/events/event-form.component').then(m => m.EventFormComponent)
  },
  {
    path: 'events/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/events/event-detail.component').then(m => m.EventDetailComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/events/tabs/event-overview-tab.component').then(m => m.EventOverviewTabComponent)
      },
      {
        path: 'attendees',
        loadComponent: () => import('./features/events/tabs/attendee-list-tab.component').then(m => m.AttendeeListTabComponent)
      },
      {
        path: 'check-in',
        loadComponent: () => import('./features/events/tabs/event-checkin-tab.component').then(m => m.EventCheckInTabComponent)
      },
      {
        path: 'import',
        loadComponent: () => import('./features/events/tabs/excel-import-tab.component').then(m => m.ExcelImportTabComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/events/tabs/event-analytics-tab.component').then(m => m.EventAnalyticsTabComponent)
      }
    ]
  },

  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];
