import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { EventService } from '../../core/services/event.service';
import { ToastService } from '../../core/services/toast.service';
import { CustomQuestionBuilderComponent } from '../../shared/components/custom-question-builder/custom-question-builder.component';
import { CustomQuestion, Event } from '../../core/models/event.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CustomQuestionBuilderComponent],
  template: `
    <div class="event-form-page container container-narrow">
      <div class="form-page-header">
        <a [routerLink]="isEditMode ? ['/events', eventId] : '/dashboard'" class="back-link">
          ← {{ isEditMode ? 'Back to Event Hub' : 'Back to Dashboard' }}
        </a>
        <h1 class="page-title">{{ isEditMode ? 'Edit Event Configuration' : 'Create New Event' }}</h1>
        <p class="text-muted">Configure event schedule, venue, capacity limits, and custom registration fields.</p>
      </div>

      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()" class="flat-form-card">
        <!-- Section 1: Event Identity -->
        <div class="form-section">
          <h3 class="section-heading">1. Event Details & Branding</h3>
          
          <div class="form-group">
            <label class="form-label">Event Name <span class="required-star">*</span></label>
            <input 
              type="text" 
              class="form-control" 
              formControlName="name" 
              placeholder="e.g. NextGen Web & Cloud Summit 2026" 
            />
            <div *ngIf="isFieldInvalid('name')" class="form-error">Event name is required.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Tagline / Subtitle</label>
            <input 
              type="text" 
              class="form-control" 
              formControlName="tagline" 
              placeholder="e.g. Discover high-performance architectural patterns" 
            />
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" formControlName="category">
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="celebration">Celebration / Party</option>
              <option value="seminar">Seminar</option>
              <option value="networking">Networking Event</option>
              <option value="webinar">Webinar</option>
            </select>
          </div>

          <!-- Banner Image Section: File Upload or Image URL -->
          <div class="form-group">
            <div class="flex justify-between items-center mb-1">
              <label class="form-label mb-0">Event Banner Image</label>
              <span class="text-xs text-muted">Upload file or paste image URL</span>
            </div>

            <div class="banner-input-container">
              <div class="grid grid-cols-2 gap-3">
                <!-- File Upload Button -->
                <div class="banner-upload-box">
                  <input
                    type="file"
                    #bannerFileInput
                    (change)="onBannerFileSelected($event)"
                    accept="image/*"
                    style="display: none;"
                  />
                  <button
                    type="button"
                    (click)="bannerFileInput.click()"
                    class="btn btn-secondary btn-block"
                  >
                    📁 Upload Image File
                  </button>
                  <p class="text-xs text-muted text-center mt-1">PNG, JPG, WebP (Max 5MB)</p>
                </div>

                <!-- URL input -->
                <div class="banner-url-box">
                  <input
                    type="text"
                    class="form-control"
                    formControlName="bannerUrl"
                    placeholder="https://images.unsplash.com/..."
                  />
                  <p class="text-xs text-muted mt-1">Or paste direct image URL</p>
                </div>
              </div>

              <!-- Banner Image Editor -->
              <div *ngIf="eventForm.get('bannerUrl')?.value" class="banner-editor-wrap mt-3">

                <!-- Drag canvas -->
                <div
                  #bannerCanvas
                  class="banner-canvas"
                  [class.dragging]="isDragging"
                  (mousedown)="onDragStart($event)"
                  (wheel)="onWheel($event)"
                  (touchstart)="onTouchStart($event)"
                  (touchmove)="onTouchMove($event)"
                  (touchend)="onTouchEnd()"
                >
                  <img
                    #bannerImg
                    [src]="eventForm.get('bannerUrl')?.value"
                    class="banner-canvas-img"
                    [style.width.px]="imgDisplayW"
                    [style.height.px]="imgDisplayH"
                    [style.left.px]="bannerOffsetX"
                    [style.top.px]="bannerOffsetY"
                    draggable="false"
                    (load)="onImageLoad()"
                    alt="Banner preview"
                  />
                  <span class="preview-badge">Banner Preview · Drag to reposition</span>
                  <button type="button" (click)="clearBanner()" class="btn-clear-banner" title="Remove Banner">✕</button>
                </div>

                <!-- Controls toolbar -->
                <div class="banner-toolbar">
                  <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" (click)="zoomOut()" title="Zoom out">−</button>
                    <input
                      type="range"
                      class="zoom-slider"
                      [min]="ZOOM_MIN" [max]="ZOOM_MAX" [step]="0.05"
                      [value]="bannerZoom"
                      (input)="onZoomSlider($any($event))"
                    />
                    <button type="button" class="toolbar-btn" (click)="zoomIn()" title="Zoom in">+</button>
                    <span class="zoom-label">{{ (bannerZoom * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <button type="button" class="toolbar-btn toolbar-btn-reset" (click)="resetBanner()" title="Reset position & zoom">↺ Reset</button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Event Description <span class="required-star">*</span></label>
            <textarea 
              class="form-control" 
              rows="3" 
              formControlName="description" 
              placeholder="Provide event overview, schedule highlights, and target attendees..."
            ></textarea>
            <div *ngIf="isFieldInvalid('description')" class="form-error">Description is required.</div>
          </div>
        </div>

        <!-- Section 2: Date, Time & Venue -->
        <div class="form-section">
          <h3 class="section-heading">2. Date, Venue & Capacity</h3>

          <div class="grid grid-cols-3 gap-3">
            <div class="form-group">
              <label class="form-label">Event Date <span class="required-star">*</span></label>
              <input type="date" class="form-control" [class.is-invalid]="isFieldInvalid('date')" formControlName="date" />
              <div *ngIf="isFieldInvalid('date')" class="form-error">Date is required.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Start Time <span class="required-star">*</span></label>
              <input type="time" class="form-control" [class.is-invalid]="isFieldInvalid('startTime')" formControlName="startTime" />
              <div *ngIf="isFieldInvalid('startTime')" class="form-error">Start time is required.</div>
            </div>

            <div class="form-group">
              <label class="form-label">End Time <span class="required-star">*</span></label>
              <input type="time" class="form-control" [class.is-invalid]="isFieldInvalid('endTime')" formControlName="endTime" />
              <div *ngIf="isFieldInvalid('endTime')" class="form-error">End time is required.</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Venue Name <span class="required-star">*</span></label>
              <input
                type="text"
                class="form-control"
                [class.is-invalid]="isFieldInvalid('venue')"
                formControlName="venue"
                placeholder="e.g. Grand Silicon Center - Hall B"
              />
              <div *ngIf="isFieldInvalid('venue')" class="form-error">Venue name is required.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Physical Address <span class="required-star">*</span></label>
              <!-- Photon location search (live autocomplete, no API key) -->
              <div style="position:relative;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:18px;flex-shrink:0;">📍</span>
                  <input
                    type="text"
                    class="form-control"
                    [class.is-invalid]="isFieldInvalid('address')"
                    formControlName="address"
                    placeholder="Search venue, landmark or address…"
                    (input)="onPhotonInput($any($event))"
                    (keydown.escape)="photonResults = []"
                    autocomplete="off"
                    style="flex:1;"
                  />
                  <span *ngIf="photonLoading" style="font-size:12px;color:#57606a;white-space:nowrap;flex-shrink:0;">Searching…</span>
                </div>
                <!-- Live suggestion dropdown -->
                <div
                  *ngIf="photonResults.length"
                  style="position:absolute;top:100%;left:0;right:0;z-index:1000;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.12);max-height:260px;overflow-y:auto;margin-top:2px;"
                >
                  <div
                    *ngFor="let r of photonResults"
                    (click)="selectPhotonResult(r)"
                    style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6;font-size:13px;line-height:1.5;"
                    onmouseover="this.style.background='#f7f8fa'"
                    onmouseout="this.style.background='#fff'"
                  >
                    <div style="font-weight:600;color:#1f2328;">{{ r.name }}</div>
                    <div style="color:#57606a;font-size:12px;">{{ r.address }}</div>
                  </div>
                  <div
                    (click)="photonResults = []"
                    style="padding:7px 14px;font-size:11px;color:#57606a;cursor:pointer;text-align:right;background:#fafafa;"
                  >✕ Close</div>
                </div>
              </div>
              <div *ngIf="isFieldInvalid('address')" class="form-error">Physical address is required.</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Registration Deadline <span class="required-star">*</span></label>
              <input type="date" class="form-control" [class.is-invalid]="isFieldInvalid('registrationDeadline')" formControlName="registrationDeadline" />
              <div *ngIf="isFieldInvalid('registrationDeadline')" class="form-error">Registration deadline is required.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Maximum Capacity <span class="required-star">*</span></label>
              <input
                type="number"
                class="form-control"
                [class.is-invalid]="isFieldInvalid('capacity')"
                formControlName="capacity"
                min="1"
                placeholder="e.g. 300"
              />
              <div *ngIf="isFieldInvalid('capacity')" class="form-error">Valid capacity (min 1) is required.</div>
            </div>
          </div>
        </div>

        <!-- Section 3: Organizer Contact & Rules -->
        <div class="form-section">
          <h3 class="section-heading">3. Organizer Contact & Check-In Rules</h3>

          <div class="grid grid-cols-3 gap-3">
            <div class="form-group">
              <label class="form-label">Organizer Name <span class="required-star">*</span></label>
              <input type="text" class="form-control" [class.is-invalid]="isFieldInvalid('organizerName')" formControlName="organizerName" />
              <div *ngIf="isFieldInvalid('organizerName')" class="form-error">Organizer name is required.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Contact Email <span class="required-star">*</span></label>
              <input type="email" class="form-control" [class.is-invalid]="isFieldInvalid('contactEmail')" formControlName="contactEmail" />
              <div *ngIf="isFieldInvalid('contactEmail')" class="form-error">Valid contact email is required.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input
                type="tel"
                class="form-control"
                [class.is-invalid]="isFieldInvalid('contactNumber')"
                formControlName="contactNumber"
                placeholder="+1 (555) 234-5678"
              />
              <div *ngIf="isFieldInvalid('contactNumber')" class="form-error">
                Enter a valid phone number (digits, spaces, +, -, (, ) only).
              </div>
            </div>
          </div>

          <div class="flex gap-6 items-center p-3 bg-gray-50 border rounded-md flex-wrap">
            <label class="toggle-control flex items-center gap-2">
              <input type="checkbox" formControlName="isWalkInAllowed" />
              <span class="font-bold text-sm">Allow On-Site Walk-In Registrations</span>
            </label>

            <label class="toggle-control flex items-center gap-2">
              <input type="checkbox" formControlName="isRsvpEnabled" />
              <span class="font-bold text-sm">Enable Public RSVP Page</span>
            </label>

            <label class="toggle-control flex items-center gap-2">
              <input type="checkbox" formControlName="isQrEnabled" />
              <span class="font-bold text-sm">Enable QR Pass</span>
            </label>
          </div>
        </div>

        <!-- Section 4: Custom Registration Questions -->
        <div class="form-section">
          <h3 class="section-heading">4. Custom Attendee Questions</h3>
          <app-custom-question-builder 
            [questions]="customQuestions" 
            (questionsChange)="customQuestions = $event"
          ></app-custom-question-builder>
        </div>

        <!-- Form Actions -->
        <div class="form-actions flex justify-between items-center">
          <a [routerLink]="isEditMode ? ['/events', eventId] : '/dashboard'" class="btn btn-secondary">
            Cancel
          </a>
          <button type="submit" [disabled]="isSubmitting" class="btn btn-primary btn-lg">
            {{ isEditMode ? 'Save Event Changes' : 'Publish Event & Open RSVP →' }}
          </button>
        </div>
      </form>

      <!-- Danger Zone: Delete Event (organizer only, edit mode only) -->
      <div *ngIf="isEditMode && isOwner" class="danger-zone-card flat-card mt-6">
        <div class="danger-zone-header">
          <p class="danger-zone-desc">
            Permanently delete this event and all its registrations, attendees, and QR passes. This action cannot be undone.
          </p>
        </div>
        <button type="button" (click)="confirmDeleteEvent()" class="btn btn-coral">
          🗑 Delete This Event
        </button>
      </div>
    </div>
  `,
  styles: [`
    .event-form-page {
      padding: 2.5rem 1.25rem 4rem;
    }
    .form-page-header {
      margin-bottom: 2rem;
    }
    .back-link {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--flat-primary);
      margin-bottom: 0.5rem;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--flat-dark);
      letter-spacing: -0.02em;
    }
    .flat-form-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--flat-border);
    }
    .form-section:last-of-type {
      border-bottom: none;
    }
    .section-heading {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .toggle-control {
      cursor: pointer;
    }
    .banner-input-container {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }
    .banner-editor-wrap {
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1.5px solid var(--flat-border);
    }
    .banner-canvas {
      position: relative;
      height: 160px;
      overflow: hidden;
      cursor: grab;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    .banner-canvas.dragging {
      cursor: grabbing;
    }
    .banner-canvas-img {
      position: absolute;
      pointer-events: none;
      user-select: none;
      will-change: left, top, width, height;
    }
    .banner-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: var(--flat-gray-50);
      border-top: 1px solid var(--flat-border);
    }
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .toolbar-btn {
      background: var(--flat-white);
      border: 1.5px solid var(--flat-border);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      cursor: pointer;
      line-height: 1.4;
      color: var(--flat-dark);
    }
    .toolbar-btn:hover {
      background: var(--flat-gray-100);
    }
    .toolbar-btn-reset {
      color: var(--flat-primary);
      border-color: var(--flat-primary);
    }
    .zoom-slider {
      width: 90px;
      accent-color: var(--flat-primary);
      cursor: pointer;
    }
    .zoom-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--flat-gray-600);
      min-width: 36px;
      text-align: right;
    }
    .preview-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.6rem;
      background: rgba(15, 23, 42, 0.82);
      color: var(--flat-white);
      font-size: 0.6rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 2;
    }
    .btn-clear-banner {
      position: absolute;
      top: 0.45rem;
      right: 0.5rem;
      z-index: 3;
      background: rgba(239, 68, 68, 0.9);
      color: var(--flat-white);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 800;
    }
    .btn-clear-banner:hover {
      background: var(--flat-coral);
    }
    .form-actions {
      padding-top: 1rem;
    }
    .danger-zone-card {
      border: 2px solid var(--flat-coral);
      border-radius: var(--radius-xl);
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .danger-zone-header {
      flex: 1;
    }
    .danger-zone-label {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--flat-coral-dark, #b91c1c);
      letter-spacing: 0.06em;
    }
    .danger-zone-desc {
      font-size: 0.85rem;
      color: var(--flat-gray-600);
      margin-top: 0.35rem;
    }
    .mt-6 { margin-top: 1.5rem; }
  `]
})
export class EventFormComponent implements OnInit {
  eventForm!: FormGroup;
  isEditMode = false;
  eventId = '';
  isSubmitting = false;
  customQuestions: CustomQuestion[] = [];
  currentOrganizerId = 'usr_org_001';
  isOwner = false;

  // ── Photon location search ────────────────────────────────────────────────
  photonQuery = '';
  photonLoading = false;
  photonResults: Array<{ name: string; address: string; lat: number; lng: number }> = [];
  private photonSubject = new Subject<string>();
  // Stored coords from Photon selection
  private selectedLat: number | null = null;
  private selectedLng: number | null = null;

  // ── Banner editor ────────────────────────────────────────────────────────
  @ViewChild('bannerCanvas') bannerCanvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('bannerImg')    bannerImgRef!: ElementRef<HTMLImageElement>;

  readonly ZOOM_MIN  = 0.5;   // allow zooming out below "contain"
  readonly ZOOM_MAX  = 4;
  readonly ZOOM_STEP = 0.1;

  // Natural image dimensions (set on load)
  private imgNatW = 0;
  private imgNatH = 0;

  // Canvas dimensions (160px tall, full container width)
  private canvasW = 0;
  private canvasH = 160;

  // zoom = scale relative to the contain-fit baseline
  bannerZoom    = 1;
  bannerOffsetX = 0;   // px, top-left of image inside canvas
  bannerOffsetY = 0;

  // Computed display dimensions (driven by zoom + natural size)
  imgDisplayW = 0;
  imgDisplayH = 0;

  // drag state
  isDragging      = false;
  private dragStartX  = 0;
  private dragStartY  = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;

  // pinch state
  private lastPinchDist = 0;
  private lastPinchZoom = 1;

  /** Called when the <img> fires its load event — record natural dims; apply saved state or fitContain. */
  onImageLoad(): void {
    const img = this.bannerImgRef?.nativeElement;
    if (!img) return;
    this.imgNatW = img.naturalWidth  || img.width  || 800;
    this.imgNatH = img.naturalHeight || img.height || 400;
    this.canvasW = this.bannerCanvasRef?.nativeElement?.offsetWidth || this.canvasW || 600;
    this.canvasH = 160;

    // If imgDisplayW > 0, the saved pixel dimensions have already been restored
    // (set in loadEventData). Just trust them — do NOT recalculate.
    if (this.imgDisplayW > 0) {
      return;  // saved state is authoritative; nothing to recompute
    }

    // imgDisplayW === 0 → fresh upload or new event → fit-contain
    this.fitContain();
  }

  /** Scale image to fit entirely inside canvas (contain). */
  private fitContain(): void {
    this.canvasW = this.bannerCanvasRef?.nativeElement?.offsetWidth || 600;
    const scaleW = this.canvasW / this.imgNatW;
    const scaleH = this.canvasH / this.imgNatH;
    const scale  = Math.min(scaleW, scaleH);   // contain scale (fit both axes)
    this.bannerZoom   = 1;                      // zoom=1 means "contain"
    this.imgDisplayW  = Math.round(this.imgNatW * scale);
    this.imgDisplayH  = Math.round(this.imgNatH * scale);
    // Centre in canvas
    this.bannerOffsetX = Math.round((this.canvasW - this.imgDisplayW) / 2);
    this.bannerOffsetY = Math.round((this.canvasH - this.imgDisplayH) / 2);
  }

  /** Re-compute display size when zoom changes, keeping the image centred. */
  private _applyZoom(newZoom: number): void {
    this.canvasW = this.bannerCanvasRef?.nativeElement?.offsetWidth || 600;
    const scaleW  = this.canvasW / this.imgNatW;
    const scaleH  = this.canvasH / this.imgNatH;
    const baseScale = Math.min(scaleW, scaleH);    // contain baseline

    const oldW = this.imgDisplayW || Math.round(this.imgNatW * baseScale);
    const oldH = this.imgDisplayH || Math.round(this.imgNatH * baseScale);
    const newW = Math.round(this.imgNatW * baseScale * newZoom);
    const newH = Math.round(this.imgNatH * baseScale * newZoom);

    // Keep the visual centre of the image fixed while zooming
    const cx = this.bannerOffsetX + oldW / 2;
    const cy = this.bannerOffsetY + oldH / 2;

    this.bannerZoom   = +newZoom.toFixed(2);
    this.imgDisplayW  = newW;
    this.imgDisplayH  = newH;
    this.bannerOffsetX = Math.round(cx - newW / 2);
    this.bannerOffsetY = Math.round(cy - newH / 2);
  }

  // ── Mouse drag ───────────────────────────────────────────────────────────
  onDragStart(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.btn-clear-banner')) return;
    e.preventDefault();
    this.isDragging  = true;
    this.dragStartX  = e.clientX;
    this.dragStartY  = e.clientY;
    this.dragOriginX = this.bannerOffsetX;
    this.dragOriginY = this.bannerOffsetY;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.bannerOffsetX = this.dragOriginX + (e.clientX - this.dragStartX);
    this.bannerOffsetY = this.dragOriginY + (e.clientY - this.dragStartY);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void { this.isDragging = false; }

  // ── Scroll-wheel zoom ────────────────────────────────────────────────────
  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
    this._applyZoom(Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, this.bannerZoom + delta)));
  }

  // ── Touch drag + pinch ───────────────────────────────────────────────────
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging  = true;
      this.dragStartX  = e.touches[0].clientX;
      this.dragStartY  = e.touches[0].clientY;
      this.dragOriginX = this.bannerOffsetX;
      this.dragOriginY = this.bannerOffsetY;
    } else if (e.touches.length === 2) {
      this.isDragging    = false;
      this.lastPinchDist = this.pinchDist(e);
      this.lastPinchZoom = this.bannerZoom;
    }
  }

  onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      this.bannerOffsetX = this.dragOriginX + (e.touches[0].clientX - this.dragStartX);
      this.bannerOffsetY = this.dragOriginY + (e.touches[0].clientY - this.dragStartY);
    } else if (e.touches.length === 2) {
      const dist  = this.pinchDist(e);
      const ratio = dist / this.lastPinchDist;
      this._applyZoom(Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, this.lastPinchZoom * ratio)));
    }
  }

  onTouchEnd(): void { this.isDragging = false; }

  private pinchDist(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Toolbar ──────────────────────────────────────────────────────────────
  zoomIn():  void { this._applyZoom(Math.min(this.ZOOM_MAX, this.bannerZoom + this.ZOOM_STEP)); }
  zoomOut(): void { this._applyZoom(Math.max(this.ZOOM_MIN, this.bannerZoom - this.ZOOM_STEP)); }

  onZoomSlider(e: InputEvent): void {
    this._applyZoom(+parseFloat((e.target as HTMLInputElement).value).toFixed(2));
  }

  resetBanner(): void {
    this.imgDisplayW  = 0;   // force fitContain on next load
    this.imgDisplayH  = 0;
    this.bannerZoom   = 1;
    this.bannerOffsetX = 0;
    this.bannerOffsetY = 0;
    // If image is already loaded, refit immediately
    if (this.imgNatW > 0) { this.fitContain(); }
  }

  // ── Constructor / lifecycle ───────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  // ── Photon (OpenStreetMap) live search — no API key, completely free ───────
  private initPhotonSearch(): void {
    this.photonSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.photonLoading = false;
          this.photonResults = [];
          return of(null);
        }
        this.photonLoading = true;
        return this.http.get<any>(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`
        ).pipe(
          catchError(() => {
            this.photonLoading = false;
            this.photonResults = [];
            return of(null);
          })
        );
      })
    ).subscribe((res: any) => {
      this.photonLoading = false;
      if (!res?.features) return;
      this.photonResults = res.features.map((f: any) => {
        const p = f.properties || {};
        const street = p.street
          ? p.street + (p.housenumber ? ' ' + p.housenumber : '')
          : '';
        const addrParts = [street, p.city || p.town || p.village, p.state, p.country]
          .filter(Boolean);
        return {
          name: p.name || p.city || p.country || 'Unknown',
          address: addrParts.join(', '),
          lat: f.geometry?.coordinates?.[1] ?? 0,
          lng: f.geometry?.coordinates?.[0] ?? 0
        };
      });
    });
  }

  onPhotonInput(event: any): void {
    const val = (event.target as HTMLInputElement).value;
    this.photonSubject.next(val);
  }

  selectPhotonResult(r: { name: string; address: string; lat: number; lng: number }): void {
    const fullAddress = [r.name, r.address].filter(Boolean).join(', ');
    this.eventForm.patchValue({ address: fullAddress });
    if (!this.eventForm.get('venue')?.value && r.name) {
      this.eventForm.patchValue({ venue: r.name });
    }
    this.selectedLat = r.lat;
    this.selectedLng = r.lng;
    this.photonResults = [];
  }

  ngOnInit(): void {
    this.initForm();
    this.initPhotonSearch();

    // Listen to currentUser$ in case authentication hydrates asynchronously (e.g. from IndexedDB on fresh load)
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentOrganizerId = user.id;
        if (!this.isEditMode) {
          if (!this.eventForm.get('organizerName')?.value || this.eventForm.get('organizerName')?.value === 'Organizer') {
            this.eventForm.patchValue({ organizerName: user.name });
          }
          if (!this.eventForm.get('contactEmail')?.value || this.eventForm.get('contactEmail')?.value === 'organizer@evently.io') {
            this.eventForm.patchValue({ contactEmail: user.email });
          }
        }
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.eventId = id;
      this.loadEventData(id);
    }
  }

  private initForm(): void {
    const today = new Date();
    const defaultDate     = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0];
    const defaultDeadline = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.currentOrganizerId = currentUser.id;
    }

    this.eventForm = this.fb.group({
      name:                 ['', [Validators.required, Validators.minLength(3)]],
      tagline:              [''],
      category:             ['conference', Validators.required],
      bannerUrl:            ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80'],
      description:          ['', [Validators.required, Validators.minLength(10)]],
      date:                 [defaultDate, Validators.required],
      startTime:            ['09:00', Validators.required],
      endTime:              ['17:00', Validators.required],
      venue:                ['', Validators.required],
      address:              ['', Validators.required],
      registrationDeadline: [defaultDeadline, Validators.required],
      capacity:             [200, [Validators.required, Validators.min(1)]],
      organizerName:        [currentUser?.name  || 'Organizer',            Validators.required],
      contactEmail:         [currentUser?.email || 'organizer@evently.io', [Validators.required, Validators.email]],
      contactNumber:        ['+1 (555) 234-5678', Validators.pattern(/^[0-9+\-()\s.ext]+$/)],
      isWalkInAllowed:      [true],
      isRsvpEnabled:        [true],
      isQrEnabled:          [true]
    });
  }

  private loadEventData(id: string): void {
    const evt = this.eventService.getEventById(id);
    if (!evt) {
      this.toastService.error('Event Not Found', 'Could not locate event.');
      this.router.navigate(['/dashboard']);
      return;
    }

    const currentUser = this.authService.currentUserValue;
    this.isOwner = !!currentUser && evt.organizerId === currentUser.id;

    // Restore all banner editor state from saved values.
    // When imgDisplayW > 0, onImageLoad will trust these values and skip recomputation.
    this.bannerOffsetX = evt.bannerOffsetX ?? 0;
    this.bannerOffsetY = evt.bannerOffsetY ?? 0;
    this.bannerZoom    = evt.bannerZoom    ?? 1;
    this.imgDisplayW   = evt.bannerImgW   ?? 0;
    this.imgDisplayH   = evt.bannerImgH   ?? 0;
    this.canvasW       = evt.bannerCanvasW ?? 0;

    this.eventForm.patchValue({
      name:                 evt.name,
      tagline:              evt.tagline || '',
      category:             evt.category,
      bannerUrl:            evt.bannerUrl,
      description:          evt.description,
      date:                 evt.date,
      startTime:            evt.startTime,
      endTime:              evt.endTime,
      venue:                evt.venue,
      address:              evt.address,
      registrationDeadline: evt.registrationDeadline,
      capacity:             evt.capacity,
      organizerName:        evt.organizerName,
      contactEmail:         evt.contactEmail,
      contactNumber:        evt.contactNumber,
      isWalkInAllowed:      evt.isWalkInAllowed,
      isRsvpEnabled:        evt.isRsvpEnabled,
      isQrEnabled:          evt.isQrEnabled ?? true
    });

    // Restore lat/lng so they're preserved on re-save
    this.selectedLat = evt.latitude ?? null;
    this.selectedLng = evt.longitude ?? null;

    this.customQuestions = this.eventService.getCustomQuestionsForEvent(id);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.eventForm.get(field);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  onBannerFileSelected(event: Event | any): void {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Invalid File', 'Please select an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('File Too Large', 'Banner image should be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.eventForm.patchValue({ bannerUrl: e.target.result as string });
      this.resetBanner();
      this.toastService.success('Banner Uploaded', 'Drag and zoom to adjust the crop.');
    };
    reader.readAsDataURL(file);
  }

  clearBanner(): void {
    this.eventForm.patchValue({ bannerUrl: '' });
    this.resetBanner();
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      const invalidFields: string[] = [];
      const labels: Record<string, string> = {
        name: 'Event Name',
        description: 'Event Description',
        date: 'Event Date',
        startTime: 'Start Time',
        endTime: 'End Time',
        venue: 'Venue Name',
        address: 'Physical Address',
        registrationDeadline: 'Registration Deadline',
        capacity: 'Maximum Capacity',
        organizerName: 'Organizer Name',
        contactEmail: 'Contact Email',
        contactNumber: 'Contact Phone'
      };
      Object.keys(this.eventForm.controls).forEach(key => {
        if (this.eventForm.get(key)?.invalid) {
          invalidFields.push(labels[key] || key);
        }
      });
      const fieldList = invalidFields.length > 0 ? `: ${invalidFields.join(', ')}` : '';
      this.toastService.error('Form Incomplete', `Please check required fields${fieldList}`);
      return;
    }

    try {
      this.isSubmitting = true;
      const formVal = this.eventForm.value;

      // Attach all banner editor pixel values so they can be restored exactly on next edit.
      const bannerExtra = {
        bannerOffsetX:  this.bannerOffsetX,
        bannerOffsetY:  this.bannerOffsetY,
        bannerZoom:     this.bannerZoom,
        bannerImgW:     this.imgDisplayW > 0 ? this.imgDisplayW : undefined,
        bannerImgH:     this.imgDisplayH > 0 ? this.imgDisplayH : undefined,
        bannerCanvasW:  this.canvasW     > 0 ? this.canvasW     : undefined,
      };

      const coordsExtra = {
        latitude:  this.selectedLat  ?? undefined,
        longitude: this.selectedLng ?? undefined,
      };

      const activeUserId = this.authService.currentUserValue?.id || this.currentOrganizerId;

      if (this.isEditMode) {
        const updated = this.eventService.updateEvent(this.eventId, { ...formVal, ...bannerExtra, ...coordsExtra });
        if (!updated) {
          this.toastService.error('Update Failed', 'Event could not be found or updated.');
          this.isSubmitting = false;
          return;
        }
        this.eventService.saveCustomQuestionsForEvent(this.eventId, this.customQuestions);
        this.toastService.success('Event Updated', 'Changes saved successfully.');
        this.router.navigate(['/events', this.eventId]);
      } else {
        const created = this.eventService.createEvent({
          ...formVal,
          ...bannerExtra,
          ...coordsExtra,
          organizerId: activeUserId,
          badgeColor: '#2563eb'
        }, this.customQuestions);

        if (!created || !created.id) {
          this.toastService.error('Creation Failed', 'Could not create event. Please try again.');
          this.isSubmitting = false;
          return;
        }

        this.toastService.success('Event Created', `"${created.name}" is now live!`);
        this.router.navigate(['/events', created.id]);
      }
    } catch (err: any) {
      console.error('Error during event submission:', err);
      this.isSubmitting = false;
      this.toastService.error('Unexpected Error', err?.message || 'An error occurred while publishing the event.');
    }
  }

  confirmDeleteEvent(): void {
    if (!this.isEditMode || !this.eventId || !this.isOwner) return;
    const confirmed = confirm(
      'Are you sure you want to permanently delete this event?\n\nThis will remove all registrations, attendees, and QR passes. This cannot be undone.'
    );
    if (confirmed) {
      this.eventService.deleteEvent(this.eventId);
      this.toastService.success('Event Deleted', 'The event and all its data have been removed.');
      this.router.navigate(['/dashboard']);
    }
  }
}
