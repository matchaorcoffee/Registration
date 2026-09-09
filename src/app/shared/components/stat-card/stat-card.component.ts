import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flat-stat-card color-{{ color }}">
      <div class="stat-top">
        <span class="stat-label">{{ label }}</span>
        <div class="stat-icon-wrap" *ngIf="icon">
          <span class="stat-icon-char">{{ icon }}</span>
        </div>
      </div>
      <div class="stat-value-wrap">
        <span class="stat-value">{{ value }}</span>
        <span class="stat-sub" *ngIf="subtext">{{ subtext }}</span>
      </div>
      <div class="stat-progress-bar" *ngIf="progress !== undefined">
        <div class="stat-progress-fill" [style.width.%]="progress"></div>
      </div>
    </div>
  `,
  styles: [`
    .flat-stat-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
    }
    .stat-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-label {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--flat-gray-600);
    }
    .stat-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }
    .stat-value-wrap {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .stat-value {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .stat-sub {
      font-size: 0.8rem;
      color: var(--flat-gray-500);
      font-weight: 600;
    }
    .stat-progress-bar {
      width: 100%;
      height: 6px;
      background: var(--flat-gray-200);
      border-radius: var(--radius-pill);
      overflow: hidden;
      margin-top: 0.25rem;
    }
    .stat-progress-fill {
      height: 100%;
      background: var(--flat-primary);
      transition: width 0.3s ease;
    }

    /* Color variations */
    .color-primary { border-color: var(--flat-primary); }
    .color-primary .stat-icon-wrap { background: var(--flat-primary-light); color: var(--flat-primary-dark); }
    .color-primary .stat-progress-fill { background: var(--flat-primary); }

    .color-emerald { border-color: var(--flat-emerald); }
    .color-emerald .stat-icon-wrap { background: var(--flat-emerald-light); color: var(--flat-emerald-dark); }
    .color-emerald .stat-progress-fill { background: var(--flat-emerald); }

    .color-amber { border-color: var(--flat-amber); }
    .color-amber .stat-icon-wrap { background: var(--flat-amber-light); color: var(--flat-amber-dark); }
    .color-amber .stat-progress-fill { background: var(--flat-amber); }

    .color-violet { border-color: var(--flat-violet); }
    .color-violet .stat-icon-wrap { background: var(--flat-violet-light); color: var(--flat-violet); }
    .color-violet .stat-progress-fill { background: var(--flat-violet); }
  `]
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() subtext = '';
  @Input() icon = '';
  @Input() color: 'primary' | 'emerald' | 'amber' | 'violet' | 'gray' = 'primary';
  @Input() progress?: number;
}
