import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      <div 
        *ngFor="let toast of toastService.toasts$ | async" 
        class="flat-toast flat-toast-{{ toast.type }}"
      >
        <div class="toast-indicator"></div>
        <div class="toast-body">
          <strong class="toast-title">{{ toast.title }}</strong>
          <p class="toast-msg" *ngIf="toast.message">{{ toast.message }}</p>
        </div>
        <button class="toast-close" (click)="toastService.remove(toast.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      z-index: 9999;
      max-width: 380px;
      width: calc(100% - 3rem);
      pointer-events: none;
    }
    .flat-toast {
      pointer-events: auto;
      background: var(--flat-dark);
      color: var(--flat-white);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      border: 1px solid var(--flat-gray-700);
      position: relative;
      overflow: hidden;
      animation: slideUp 0.2s ease forwards;
    }
    @keyframes slideUp {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast-indicator {
      width: 4px;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
    }
    .flat-toast-success .toast-indicator { background: var(--flat-emerald); }
    .flat-toast-error .toast-indicator { background: var(--flat-coral); }
    .flat-toast-warning .toast-indicator { background: var(--flat-amber); }
    .flat-toast-info .toast-indicator { background: var(--flat-primary); }

    .toast-body {
      flex: 1;
      padding-left: 0.25rem;
    }
    .toast-title {
      display: block;
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .toast-msg {
      font-size: 0.8rem;
      color: var(--flat-gray-300);
      margin-top: 0.25rem;
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      color: var(--flat-gray-400);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0.2rem;
    }
    .toast-close:hover {
      color: var(--flat-white);
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
