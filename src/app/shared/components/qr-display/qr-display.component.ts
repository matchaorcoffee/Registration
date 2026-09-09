import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeService } from '../../../core/services/qrcode.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flat-qr-card">
      <div class="qr-preview-box">
        <img *ngIf="qrDataUrl" [src]="qrDataUrl" alt="Event QR Pass" class="qr-image" />
        <div *ngIf="!qrDataUrl" class="qr-loading">Generating Pass...</div>
      </div>

      <div class="qr-info">
        <div class="qr-badge">
          <span class="dot"></span> SECURE TOKEN PASS
        </div>
        <code class="qr-token-string" title="Unique registration token">{{ token }}</code>
      </div>

      <div class="qr-actions" *ngIf="showActions">
        <button (click)="downloadQr()" class="btn btn-sm btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Save Pass (PNG)
        </button>

        <button (click)="copyToken()" class="btn btn-sm btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          Copy Token
        </button>
      </div>
    </div>
  `,
  styles: [`
    .flat-qr-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1rem;
      max-width: 320px;
      margin: 0 auto;
    }
    .qr-preview-box {
      width: 200px;
      height: 200px;
      background: var(--flat-white);
      border: 2px solid var(--flat-border);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
    }
    .qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .qr-loading {
      font-size: 0.85rem;
      color: var(--flat-gray-500);
      font-weight: 600;
    }
    .qr-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
    }
    .qr-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--flat-gray-100);
      color: var(--flat-gray-700);
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-pill);
    }
    .dot {
      width: 6px;
      height: 6px;
      background: var(--flat-emerald);
      border-radius: 50%;
    }
    .qr-token-string {
      font-family: var(--font-mono);
      font-size: 0.725rem;
      color: var(--flat-gray-500);
      background: var(--flat-gray-50);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--flat-border);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qr-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
  `]
})
export class QrDisplayComponent implements OnChanges {
  @Input() token = '';
  @Input() guestName = '';
  @Input() regId = '';
  @Input() showActions = true;

  qrDataUrl = '';

  constructor(
    private qrCodeService: QRCodeService,
    private toastService: ToastService
  ) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['token'] && this.token) {
      this.qrDataUrl = await this.qrCodeService.generateQRCodeDataUrl(this.token);
    }
  }

  downloadQr(): void {
    if (!this.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = `Pass_${this.regId || 'Evently'}_${(this.guestName || 'guest').replace(/\s+/g, '_')}.png`;
    link.click();
    this.toastService.success('Pass Saved', 'QR pass image downloaded to your device.');
  }

  copyToken(): void {
    if (!this.token) return;
    navigator.clipboard.writeText(this.token);
    this.toastService.info('Copied', 'Secure token copied to clipboard.');
  }
}
