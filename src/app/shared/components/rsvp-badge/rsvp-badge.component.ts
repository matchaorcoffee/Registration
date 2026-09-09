import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RSVPStatus } from '../../../core/models/event.model';

@Component({
  selector: 'app-rsvp-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="getBadgeClass()">
      <span class="badge-dot"></span>
      {{ getLabel() }}
    </span>
  `,
  styles: [`
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
      background: currentColor;
    }
  `]
})
export class RsvpBadgeComponent {
  @Input() status: RSVPStatus = 'attending';

  getBadgeClass(): string {
    switch (this.status) {
      case 'attending': return 'badge-emerald';
      case 'maybe': return 'badge-amber';
      case 'declined': return 'badge-coral';
      case 'pending': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  getLabel(): string {
    switch (this.status) {
      case 'attending': return 'Attending';
      case 'maybe': return 'Maybe';
      case 'declined': return 'Declined';
      case 'pending': return 'Invited / Pending';
      default: return this.status;
    }
  }
}
