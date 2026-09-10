import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { ToastService } from '../../core/services/toast.service';
import { CustomQuestionBuilderComponent } from '../../shared/components/custom-question-builder/custom-question-builder.component';
import { CustomQuestion, Event } from '../../core/models/event.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CustomQuestionBuilderComponent],
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
                    [src]="eventForm.get('bannerUrl')?.value"
                    class="banner-canvas-img"
                    [style.transform]="bannerTransform"
                    draggable="false"
                    alt="Banner preview"
                  />
                  <!-- overlay labels -->
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
              <input type="date" class="form-control" formControlName="date" />
              <div *ngIf="isFieldInvalid('date')" class="form-error">Date is required.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Start Time <span class="required-star">*</span></label>
              <input type="time" class="form-control" formControlName="startTime" />
            </div>

            <div class="form-group">
              <label class="form-label">End Time <span class="required-star">*</span></label>
              <input type="time" class="form-control" formControlName="endTime" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Venue Name <span class="required-star">*</span></label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="venue" 
                placeholder="e.g. Grand Silicon Center - Hall B" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Physical Address <span class="required-star">*</span></label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="address" 
                placeholder="e.g. 500 Technology Dr, San Francisco, CA" 
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Registration Deadline <span class="required-star">*</span></label>
              <input type="date" class="form-control" formControlName="registrationDeadline" />
            </div>

            <div class="form-group">
              <label class="form-label">Maximum Capacity <span class="required-star">*</span></label>
              <input 
                type="number" 
                class="form-control" 
                formControlName="capacity" 
                min="1" 
                placeholder="e.g. 300" 
              />
            </div>
          </div>
        </div>

        <!-- Section 3: Organizer Contact & Rules -->
        <div class="form-section">
          <h3 class="section-heading">3. Organizer Contact & Check-In Rules</h3>

          <div class="grid grid-cols-3 gap-3">
            <div class="form-group">
              <label class="form-label">Organizer Name <span class="required-star">*</span></label>
              <input type="text" class="form-control" formControlName="organizerName" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Email <span class="required-star">*</span></label>
              <input type="email" class="form-control" formControlName="contactEmail" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" class="form-control" formControlName="contactNumber" />
            </div>
          </div>

          <div class="flex gap-6 items-center p-3 bg-gray-50 border rounded-md">
            <label class="toggle-control flex items-center gap-2">
              <input type="checkbox" formControlName="isWalkInAllowed" />
              <span class="font-bold text-sm">Allow On-Site Walk-In Registrations</span>
            </label>

            <label class="toggle-control flex items-center gap-2">
              <input type="checkbox" formControlName="isRsvpEnabled" />
              <span class="font-bold text-sm">Enable Public RSVP Page</span>
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
          <button type="submit" [disabled]="eventForm.invalid || isSubmitting" class="btn btn-primary btn-lg">
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
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
      transform-origin: center center;
      will-change: transform;
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

  // ── Banner editor state ──────────────────────────────────────────────────
  readonly ZOOM_MIN = 1;
  readonly ZOOM_MAX = 3;
  readonly ZOOM_STEP = 0.1;

  bannerOffsetX = 0;   // px offset, translated to % on save
  bannerOffsetY = 0;
  bannerZoom    = 1;

  // drag tracking
  isDragging      = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginX = 0;
  private dragOriginY = 0;

  // pinch-to-zoom tracking
  private lastPinchDist = 0;
  private lastPinchZoom = 1;

  get bannerTransform(): string {
    return `translate(${this.bannerOffsetX}px, ${this.bannerOffsetY}px) scale(${this.bannerZoom})`;
  }

  // ── Mouse drag ────────────────────────────────────────────────────────────
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
  onMouseUp(): void {
    this.isDragging = false;
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
    this.bannerZoom = Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, +(this.bannerZoom + delta).toFixed(2)));
  }

  // ── Touch drag + pinch ────────────────────────────────────────────────────
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging  = true;
      this.dragStartX  = e.touches[0].clientX;
      this.dragStartY  = e.touches[0].clientY;
      this.dragOriginX = this.bannerOffsetX;
      this.dragOriginY = this.bannerOffsetY;
    } else if (e.touches.length === 2) {
      this.isDragging     = false;
      this.lastPinchDist  = this.pinchDist(e);
      this.lastPinchZoom  = this.bannerZoom;
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
      this.bannerZoom = Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, +(this.lastPinchZoom * ratio).toFixed(2)));
    }
  }

  onTouchEnd(): void { this.isDragging = false; }

  private pinchDist(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Toolbar actions ───────────────────────────────────────────────────────
  zoomIn():  void { this.bannerZoom = Math.min(this.ZOOM_MAX, +(this.bannerZoom + this.ZOOM_STEP).toFixed(2)); }
  zoomOut(): void { this.bannerZoom = Math.max(this.ZOOM_MIN, +(this.bannerZoom - this.ZOOM_STEP).toFixed(2)); }

  onZoomSlider(e: InputEvent): void {
    this.bannerZoom = +parseFloat((e.target as HTMLInputElement).value).toFixed(2);
  }

  resetBanner(): void {
    this.bannerOffsetX = 0;
    this.bannerOffsetY = 0;
    this.bannerZoom    = 1;
  }

  // ── Constructor / lifecycle ───────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
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
    if (currentUser) { this.currentOrganizerId = currentUser.id; }

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
      organizerName:        [currentUser?.name  || 'Alex Rivera',              Validators.required],
      contactEmail:         [currentUser?.email || 'alex.organizer@evently.io', [Validators.required, Validators.email]],
      contactNumber:        ['+1 (555) 234-5678'],
      isWalkInAllowed:      [true],
      isRsvpEnabled:        [true]
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

    // Restore banner editor state from saved values
    this.bannerOffsetX = evt.bannerOffsetX ?? 0;
    this.bannerOffsetY = evt.bannerOffsetY ?? 0;
    this.bannerZoom    = evt.bannerZoom    ?? 1;

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
      isRsvpEnabled:        evt.isRsvpEnabled
    });

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
      this.toastService.error('Form Incomplete', 'Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.eventForm.value;

    // Attach banner editor values to the saved event
    const bannerExtra = {
      bannerOffsetX: this.bannerOffsetX,
      bannerOffsetY: this.bannerOffsetY,
      bannerZoom:    this.bannerZoom
    };

    if (this.isEditMode) {
      this.eventService.updateEvent(this.eventId, { ...formVal, ...bannerExtra });
      this.eventService.saveCustomQuestionsForEvent(this.eventId, this.customQuestions);
      this.toastService.success('Event Updated', 'Changes saved successfully.');
      this.router.navigate(['/events', this.eventId]);
    } else {
      const created = this.eventService.createEvent({
        ...formVal,
        ...bannerExtra,
        organizerId: this.currentOrganizerId,
        badgeColor: '#2563eb'
      }, this.customQuestions);
      this.toastService.success('Event Created', `"${created.name}" is now live!`);
      this.router.navigate(['/events', created.id]);
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
