import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onBackdropClick($event)">
      <div class="modal-dialog" [style.maxWidth]="maxWidth">
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close-btn" (click)="close.emit()">✕</button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
        <div class="modal-footer" *ngIf="showFooter">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      z-index: 1000;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-dialog {
      background: var(--flat-surface);
      border-radius: var(--radius-lg);
      border: 2px solid var(--flat-gray-700);
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleIn 0.15s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.97); }
      to { transform: scale(1); }
    }
    .modal-header {
      padding: 1rem 1.25rem;
      background-color: var(--flat-gray-50);
      border-bottom: 1px solid var(--flat-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--flat-dark);
    }
    .modal-close-btn {
      background: none;
      border: none;
      font-size: 1.1rem;
      color: var(--flat-gray-500);
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .modal-close-btn:hover {
      background-color: var(--flat-gray-200);
      color: var(--flat-dark);
    }
    .modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 0.85rem 1.25rem;
      background-color: var(--flat-gray-50);
      border-top: 1px solid var(--flat-border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() maxWidth = '560px';
  @Input() showFooter = true;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }
}
