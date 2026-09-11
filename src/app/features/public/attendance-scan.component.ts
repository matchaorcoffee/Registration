 import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import jsQR from 'jsqr';

@Component({
  selector: 'app-attendance-scan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="scanner-page-container container container-narrow">

      <!-- Header Card -->
      <div class="scanner-header-card flat-card mb-4" *ngIf="event">
        <div class="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div class="badge-label">ATTENDANCE SCANNER</div>
            <h1 class="event-title">{{ event.name }}</h1>
            <p class="text-xs text-muted">📍 {{ event.venue }} • Point camera at the event's Attendance QR</p>
          </div>
          <div class="flex gap-2">
            <a [routerLink]="['/event', event.id, 'confirm']" class="btn btn-sm btn-outline">
              Manual Confirmation
            </a>
            <a [routerLink]="['/events', event.id]" class="btn btn-sm btn-secondary">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <!-- Main Scanner Card -->
      <div class="flat-card scanner-card">
        
        <!-- Camera Viewfinder -->
        <div class="viewfinder-wrapper" *ngIf="!cameraError && !scanSuccess">
          <div class="video-container">
            <video #videoElement playsinline muted autoplay class="camera-video"></video>
            <canvas #canvasElement style="display:none;"></canvas>
            
            <div class="viewfinder-overlay">
              <div class="viewfinder-laser" *ngIf="isScanning"></div>
              <div class="viewfinder-corners">
                <span class="corner tl"></span>
                <span class="corner tr"></span>
                <span class="corner bl"></span>
                <span class="corner br"></span>
              </div>
              <div class="viewfinder-prompt">
                <span>Align Attendance QR Code within frame</span>
              </div>
            </div>
          </div>

          <div class="scanner-status-bar" *ngIf="isScanning">
            <span class="status-pulse"></span>
            <span>Camera active & listening for Attendance QR...</span>
          </div>
        </div>

        <!-- Camera Error State -->
        <div *ngIf="cameraError" class="camera-error-box">
          <div class="error-icon">📷⚠️</div>
          <h3>Camera Access Required</h3>
          <p class="text-muted text-sm mt-1 mb-4">{{ cameraError }}</p>
          <div class="flex justify-center gap-3">
            <button (click)="initCamera()" class="btn btn-primary">
              🔄 Retry Camera
            </button>
            <a [routerLink]="['/event', expectedEventId, 'confirm']" class="btn btn-secondary" *ngIf="expectedEventId">
              Go to Confirmation Page Directly
            </a>
          </div>
        </div>

        <!-- Invalid Scan State -->
        <div *ngIf="scanError" class="scan-error-box mt-4">
          <div class="scan-error-header">
            <span class="error-badge-icon">✕</span>
            <div>
              <strong class="text-coral-dark text-lg font-bold">Invalid Attendance QR</strong>
              <p class="text-xs text-muted mt-0.5">{{ scanError }}</p>
            </div>
          </div>
          <button (click)="retryScan()" class="btn btn-secondary btn-sm mt-3">
            ↺ Try Again
          </button>
        </div>

        <!-- Success Redirecting State -->
        <div *ngIf="scanSuccess" class="scan-success-box text-center py-8">
          <div class="success-icon">✓</div>
          <h2 class="text-xl font-bold text-dark mt-3">Valid Event QR Code Detected!</h2>
          <p class="text-sm text-muted mt-1">Redirecting you to the Attendance Confirmation page...</p>
          <div class="spinner mt-4"></div>
        </div>

        <!-- Manual URL / Token Fallback Input -->
        <div class="manual-scan-fallback mt-6 pt-4 border-t border-gray-200">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Trouble with camera? Paste QR URL or Token:
          </span>
          <form (ngSubmit)="handleManualInput()" class="flex gap-2">
            <input 
              type="text" 
              class="form-control text-sm" 
              [(ngModel)]="manualInputText" 
              name="manualInputText"
              placeholder="e.g. /event/{eventId}/confirm or token..."
            />
            <button type="submit" [disabled]="!manualInputText.trim()" class="btn btn-primary btn-sm">
              Verify & Go
            </button>
          </form>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .scanner-page-container {
      padding-top: 1.5rem;
      padding-bottom: 3rem;
      max-width: 680px;
      margin: 0 auto;
    }
    .scanner-header-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      box-shadow: 4px 4px 0 var(--flat-dark);
    }
    .badge-label {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--flat-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .event-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 0.15rem 0 0.25rem 0;
    }
    .scanner-card {
      background: var(--flat-surface);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 4px 4px 0 var(--flat-dark);
    }
    .viewfinder-wrapper {
      position: relative;
      width: 100%;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #000;
    }
    .video-container {
      position: relative;
      width: 100%;
      height: 360px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .viewfinder-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 240px;
      height: 240px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: var(--radius-md);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      pointer-events: none;
    }
    .viewfinder-laser {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: #3b82f6;
      box-shadow: 0 0 8px #60a5fa, 0 0 16px #3b82f6;
      animation: laserSweep 2s ease-in-out infinite alternate;
    }
    @keyframes laserSweep {
      0% { top: 5%; }
      100% { top: 92%; }
    }
    .viewfinder-corners {
      position: absolute;
      inset: 0;
    }
    .corner {
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: #3b82f6;
      border-style: solid;
      border-width: 0;
    }
    .corner.tl { top: -2px; left: -2px; border-top-width: 4px; border-left-width: 4px; }
    .corner.tr { top: -2px; right: -2px; border-top-width: 4px; border-right-width: 4px; }
    .corner.bl { bottom: -2px; left: -2px; border-bottom-width: 4px; border-left-width: 4px; }
    .corner.br { bottom: -2px; right: -2px; border-bottom-width: 4px; border-right-width: 4px; }
    .viewfinder-prompt {
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .scanner-status-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem;
      background: #0f172a;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }
    .camera-error-box {
      text-align: center;
      padding: 2.5rem 1.5rem;
      background: #fef2f2;
      border: 2px dashed #f87171;
      border-radius: var(--radius-md);
    }
    .error-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .scan-error-box {
      background: #fff1f2;
      border: 2px solid #fda4af;
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
    }
    .scan-error-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .error-badge-icon {
      width: 32px;
      height: 32px;
      background: #f43f5e;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1rem;
    }
    .text-coral-dark {
      color: #9f1239;
    }
    .scan-success-box {
      text-align: center;
    }
    .success-icon {
      width: 56px;
      height: 56px;
      background: #10b981;
      color: #ffffff;
      border-radius: 50%;
      font-size: 1.8rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AttendanceScanComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef?: ElementRef<HTMLCanvasElement>;

  event?: Event;
  expectedEventId = '';
  mediaStream: MediaStream | null = null;
  animationFrameId: number | null = null;

  isScanning = false;
  cameraError: string | null = null;
  scanError: string | null = null;
  scanSuccess = false;
  manualInputText = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('eventId');
    if (id) {
      this.expectedEventId = id;
      this.event = this.eventService.getEventById(id);
    }
    this.initCamera();
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }

  async initCamera(): Promise<void> {
    this.cameraError = null;
    this.scanError = null;
    this.stopScanning();

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera access is not supported or restricted in this browser.';
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      // Small delay to allow template binding
      setTimeout(() => {
        if (this.videoRef?.nativeElement && this.mediaStream) {
          const video = this.videoRef.nativeElement;
          video.srcObject = this.mediaStream;
          video.setAttribute('playsinline', 'true');
          video.play().then(() => {
            this.isScanning = true;
            this.scanFrame();
          }).catch(err => {
            console.warn('Video play error:', err);
            this.cameraError = 'Could not start camera playback. Please check permissions.';
          });
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraError = 'Camera permission was denied. Please allow camera access in browser settings to scan attendance QR codes.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraError = 'No camera found on this device.';
      } else {
        this.cameraError = 'Failed to access camera: ' + (err.message || 'Unknown error');
      }
    }
  }

  stopScanning(): void {
    this.isScanning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  scanFrame(): void {
    if (!this.isScanning || !this.videoRef?.nativeElement || !this.canvasRef?.nativeElement) {
      return;
    }

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          this.processScannedCode(code.data);
          return; // Stop animation loop once processed
        }
      } catch (err) {
        console.warn('Scan frame decoding error:', err);
      }
    }

    if (this.isScanning) {
      this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
    }
  }

  processScannedCode(rawData: string): void {
    const trimmed = rawData.trim();
    if (!trimmed) return;

    // Check if there is an encoded payload parameter 'ed' in the scanned URL
    const edMatch = trimmed.match(/[?&]ed=([^&#]+)/);
    let edParam = edMatch ? decodeURIComponent(edMatch[1]) : null;
    if (edParam) {
      this.eventService.hydrateFromPayload(edParam);
    }

    const extractedEventId = this.extractEventId(trimmed);

    if (!extractedEventId) {
      this.isScanning = false;
      this.scanError = `The scanned QR code does not contain a valid Evently attendance confirmation link. Scanned content: "${trimmed.substring(0, 60)}${trimmed.length > 60 ? '...' : ''}"`;
      return;
    }

    const event = this.eventService.getEventById(extractedEventId);
    if (!event && !edParam) {
      this.isScanning = false;
      this.scanError = `The scanned QR code belongs to an unknown or unavailable event (ID: ${extractedEventId}).`;
      return;
    }

    // Success: stop camera and redirect
    this.stopScanning();
    this.scanSuccess = true;
    this.scanError = null;

    setTimeout(() => {
      if (edParam) {
        this.router.navigate(['/event', extractedEventId, 'confirm'], { queryParams: { ed: edParam } });
      } else {
        this.router.navigate(['/event', extractedEventId, 'confirm']);
      }
    }, 800);
  }

  extractEventId(raw: string): string | null {
    // 1. Direct regex for /event/:eventId/confirm or /event/:eventId/scan or /event/:eventId/register
    const eventMatch = raw.match(/\/event\/([a-zA-Z0-9_\-]+)(?:\/|$)/i);
    if (eventMatch && eventMatch[1]) {
      return eventMatch[1];
    }

    // 2. Query param ?eventId=... or ?event=...
    const paramMatch = raw.match(/[?&]event(?:Id)?=([a-zA-Z0-9_\-]+)/i);
    if (paramMatch && paramMatch[1]) {
      return paramMatch[1];
    }

    // 3. Raw event ID format (e.g. evt-...)
    if (raw.startsWith('evt-') || raw.startsWith('evt_')) {
      return raw;
    }

    // 4. If an expectedEventId exists and string contains it
    if (this.expectedEventId && raw.includes(this.expectedEventId)) {
      return this.expectedEventId;
    }

    return null;
  }

  retryScan(): void {
    this.scanError = null;
    this.scanSuccess = false;
    this.initCamera();
  }

  handleManualInput(): void {
    if (!this.manualInputText.trim()) return;
    this.processScannedCode(this.manualInputText);
  }
}
