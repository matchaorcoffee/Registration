import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventStatus, RegistrationType, RegistrationSource } from '../../../core/models/event.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="getBadgeClass()">
      {{ getLabel() }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() status?: EventStatus | string;
  @Input() type?: RegistrationType;
  @Input() source?: RegistrationSource;
  @Input() checkedIn?: boolean;

  getBadgeClass(): string {
    if (this.checkedIn !== undefined) {
      return this.checkedIn ? 'badge-emerald' : 'badge-gray';
    }

    if (this.type) {
      switch (this.type) {
        case 'pre-registered': return 'badge-primary';
        case 'imported': return 'badge-indigo';
        case 'walk-in': return 'badge-amber';
      }
    }

    if (this.source) {
      switch (this.source) {
        case 'form': return 'badge-primary';
        case 'excel-import': return 'badge-indigo';
        case 'walk-in': return 'badge-amber';
      }
    }

    switch (this.status) {
      case 'registration-open': return 'badge-emerald';
      case 'ongoing': return 'badge-primary';
      case 'registration-closed': return 'badge-amber';
      case 'completed': return 'badge-gray';
      case 'draft': return 'badge-indigo';
      case 'archived': return 'badge-coral';
      default: return 'badge-gray';
    }
  }

  getLabel(): string {
    if (this.checkedIn !== undefined) {
      return this.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN';
    }

    if (this.type) {
      switch (this.type) {
        case 'pre-registered': return 'Pre-Registered';
        case 'imported': return 'Excel Import';
        case 'walk-in': return 'Walk-In';
      }
    }

    if (this.source) {
      switch (this.source) {
        case 'form': return 'Online Form';
        case 'excel-import': return 'Excel File';
        case 'walk-in': return 'Walk-In Desk';
      }
    }

    switch (this.status) {
      case 'registration-open': return 'Open';
      case 'ongoing': return 'Live / Ongoing';
      case 'registration-closed': return 'Registration Closed';
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return this.status || '';
    }
  }
}
