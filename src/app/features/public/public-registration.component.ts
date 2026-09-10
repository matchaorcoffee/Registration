import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { ToastService } from '../../core/services/toast.service';
import { Event, CustomQuestion, Registration, RSVPStatus } from '../../core/models/event.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-public-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="public-reg-wrapper" *ngIf="event">
      <div class="container container-narrow">
        <!-- Event Top Header Banner -->
        <div class="event-hero-card">
          <div class="event-banner-img"
            [style.backgroundImage]="'url(' + event.bannerUrl + ')'"
            [style.backgroundSize]="event.bannerImgW ? (event.bannerImgW + 'px ' + event.bannerImgH + 'px') : 'contain'"
            [style.backgroundPosition]="event.bannerImgW ? (event.bannerOffsetX + 'px ' + event.bannerOffsetY + 'px') : 'center'"
          >
            <div class="banner-top-badge">
              <app-status-badge [status]="event.status"></app-status-badge>
              <span class="category-pill">{{ event.category | uppercase }}</span>
            </div>
          </div>

          <div class="hero-body">
            <span class="event-badge-label">OFFICIAL EVENT REGISTRATION</span>
            <h1 class="event-title">{{ event.name }}</h1>
            <p class="event-tagline" *ngIf="event.tagline">{{ event.tagline }}</p>

            <div class="event-schedule-grid">
              <div class="schedule-box">
                <span class="s-icon">🗓</span>
                <div>
                  <span class="s-label">Date & Time</span>
                  <strong class="s-val">{{ event.date }} • {{ event.startTime }} - {{ event.endTime }}</strong>
                </div>
              </div>

              <div class="schedule-box">
                <span class="s-icon">📍</span>
                <div>
                  <span class="s-label">Location / Venue</span>
                  <strong class="s-val">{{ event.venue }}</strong>
                  <p class="text-xs text-muted">{{ event.address }}</p>
                </div>
              </div>
            </div>

            <!-- Registration Deadline & Capacity Alert -->
            <div class="deadline-strip flex justify-between items-center" *ngIf="isRegistrationOpen">
              <span class="text-xs font-bold text-gray-700">
                ⏳ RSVP Deadline: <strong>{{ event.registrationDeadline }}</strong>
              </span>
              <span class="text-xs font-bold text-emerald">
                ✓ Available Slots: <strong>{{ remainingSlots }} left</strong>
              </span>
            </div>

            <div *ngIf="!isRegistrationOpen" class="closed-alert">
              <strong>Registration is currently closed for this event.</strong>
            </div>
          </div>
        </div>

        <!-- Registration Form Card (Mobile-First) -->
        <div class="form-card" *ngIf="isRegistrationOpen">
          <div class="form-header">
            <h2 class="form-title">Guest RSVP & Registration</h2>
            <p class="text-muted text-sm">Please complete your details to generate your official QR Pass.</p>
          </div>

          <form [formGroup]="regForm" (ngSubmit)="onSubmit()">
            <!-- RSVP Decision -->
            <div class="rsvp-decision-group">
              <label class="form-label font-bold">Your Attendance RSVP <span class="required-star">*</span></label>
              <div class="rsvp-options-grid">
                <label class="rsvp-card" [class.selected]="selectedRsvp === 'attending'">
                  <input type="radio" value="attending" [(ngModel)]="selectedRsvp" [ngModelOptions]="{standalone: true}" />
                  <span class="rsvp-emoji">🎉</span>
                  <span class="rsvp-text">Yes, Attending</span>
                </label>

                <label class="rsvp-card" [class.selected]="selectedRsvp === 'maybe'">
                  <input type="radio" value="maybe" [(ngModel)]="selectedRsvp" [ngModelOptions]="{standalone: true}" />
                  <span class="rsvp-emoji">🤔</span>
                  <span class="rsvp-text">Maybe</span>
                </label>

                <label class="rsvp-card" [class.selected]="selectedRsvp === 'declined'">
                  <input type="radio" value="declined" [(ngModel)]="selectedRsvp" [ngModelOptions]="{standalone: true}" />
                  <span class="rsvp-emoji">❌</span>
                  <span class="rsvp-text">Unable to Attend</span>
                </label>
              </div>
            </div>

            <!-- Guest Personal Details (Dynamic ordered by configured columns with Primary Key on top) -->
            <div class="form-section-title">Attendee Details</div>

            <!-- Render Ordered Form Fields -->
            <ng-container *ngFor="let field of orderedFields">
              
              <!-- 1. Custom Mapped Column (e.g. ID, Student ID, VIP Level) -->
              <div *ngIf="field.isCustom" class="form-group">
                <label class="form-label">
                  {{ field.label }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="customMappedAnswersMap[field.key]"
                  [ngModelOptions]="{standalone: true}"
                  [placeholder]="'Enter ' + field.label.toLowerCase() + '...'"
                  (ngModelChange)="alreadyRegisteredInfo = null"
                  required
                />
              </div>

              <!-- 2. Full Name -->
              <div *ngIf="field.key === 'fullName'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Full Name' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="fullName"
                  placeholder="e.g. Jane Doe"
                  [class.is-invalid]="isFieldInvalid('fullName')"
                  required
                />
                <div *ngIf="isFieldInvalid('fullName')" class="form-error">Full name is required.</div>
              </div>

              <!-- 3. First Name -->
              <div *ngIf="field.key === 'firstName'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'First Name' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="firstName"
                  placeholder="e.g. Jane"
                  [class.is-invalid]="isFieldInvalid('firstName')"
                  required
                />
                <div *ngIf="isFieldInvalid('firstName')" class="form-error">First name is required.</div>
              </div>

              <!-- 4. Last Name -->
              <div *ngIf="field.key === 'lastName'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Last Name' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="lastName"
                  placeholder="e.g. Doe"
                  [class.is-invalid]="isFieldInvalid('lastName')"
                  required
                />
                <div *ngIf="isFieldInvalid('lastName')" class="form-error">Last name is required.</div>
              </div>

              <!-- 5. Email Address -->
              <div *ngIf="field.key === 'email'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Email Address' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="email"
                  class="form-control"
                  formControlName="email"
                  placeholder="jane.doe@example.com"
                  [class.is-invalid]="isFieldInvalid('email')"
                  required
                />
                <div *ngIf="isFieldInvalid('email')" class="form-error">Email address is required.</div>
              </div>

              <!-- 6. Phone -->
              <div *ngIf="field.key === 'phone'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Mobile / Phone' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="tel"
                  class="form-control"
                  formControlName="phone"
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>

              <!-- 7. Company -->
              <div *ngIf="field.key === 'company'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Company / Organization' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="company"
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <!-- 8. Job Title -->
              <div *ngIf="field.key === 'jobTitle'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Job Title / Role' }}

                  <span class="required-star">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="jobTitle"
                  placeholder="Principal Architect"
                  required
                />
              </div>

              <!-- 9. Dietary Preferences -->
              <div *ngIf="field.key === 'dietary'" class="form-group">
                <label class="form-label">
                  {{ field.label || 'Dietary Preferences' }}
                  <span class="required-star">*</span>
                </label>
                <select class="form-control" formControlName="dietaryPreferences" required>
                  <option value="">-- Select Requirement --</option>
                  <option value="None">None / Standard</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                  <option value="Halal">Halal</option>
                  <option value="Kosher">Kosher</option>
                  <option value="Dairy-Free">Dairy-Free</option>
                </select>
              </div>

            </ng-container>

            <!-- Dynamic Custom Questions (Supports all 6 types) -->
            <div *ngIf="customQuestions.length > 0" class="custom-questions-section">
              <div class="form-section-title">Event-Specific Questions</div>

              <div *ngFor="let q of customQuestions" class="custom-q-row">
                <label class="form-label">
                  {{ q.question }} <span *ngIf="q.required" class="required-star">*</span>
                </label>

                <!-- 1. Text -->
                <input 
                  *ngIf="q.type === 'text'" 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="customAnswersMap[q.id]" 
                  [ngModelOptions]="{standalone: true}"
                  [placeholder]="q.placeholder || 'Your response...'"
                />

                <!-- 2. Number -->
                <input 
                  *ngIf="q.type === 'number'" 
                  type="number" 
                  class="form-control" 
                  [(ngModel)]="customAnswersMap[q.id]" 
                  [ngModelOptions]="{standalone: true}"
                  [placeholder]="q.placeholder || 'Enter number...'"
                />

                <!-- 3. Dropdown -->
                <select 
                  *ngIf="q.type === 'dropdown'" 
                  class="form-control" 
                  [(ngModel)]="customAnswersMap[q.id]" 
                  [ngModelOptions]="{standalone: true}"
                >
                  <option value="">-- Please Select --</option>
                  <option *ngFor="let opt of q.options" [value]="opt">{{ opt }}</option>
                </select>

                <!-- 4. Radio Buttons -->
                <div *ngIf="q.type === 'radio'" class="radio-options-stack">
                  <label *ngFor="let opt of q.options" class="choice-label">
                    <input 
                      type="radio" 
                      [name]="q.id" 
                      [value]="opt" 
                      [(ngModel)]="customAnswersMap[q.id]" 
                      [ngModelOptions]="{standalone: true}"
                    />
                    <span>{{ opt }}</span>
                  </label>
                </div>

                <!-- 5. Checkboxes (Multi-select) -->
                <div *ngIf="q.type === 'checkbox'" class="checkbox-options-stack">
                  <label *ngFor="let opt of q.options" class="choice-label">
                    <input 
                      type="checkbox" 
                      [checked]="isCheckboxOptionSelected(q.id, opt)" 
                      (change)="toggleCheckboxOption(q.id, opt, $event)"
                    />
                    <span>{{ opt }}</span>
                  </label>
                </div>

                <!-- 6. Yes / No Toggle -->
                <div *ngIf="q.type === 'yes-no'" class="yes-no-group">
                  <button 
                    type="button" 
                    class="btn btn-sm" 
                    [class.btn-primary]="customAnswersMap[q.id] === true"
                    [class.btn-secondary]="customAnswersMap[q.id] !== true"
                    (click)="customAnswersMap[q.id] = true"
                  >
                    ✓ Yes
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-sm" 
                    [class.btn-coral]="customAnswersMap[q.id] === false"
                    [class.btn-secondary]="customAnswersMap[q.id] !== false"
                    (click)="customAnswersMap[q.id] = false"
                  >
                    ✕ No
                  </button>
                </div>
              </div>
            </div>

            <!-- Already Registered Banner -->
            <div *ngIf="alreadyRegisteredInfo" class="already-registered-banner">
              <div class="already-reg-icon">✅</div>
              <div class="already-reg-body">
                <strong>You're already registered!</strong>
                <p>Our records show that <strong>{{ alreadyRegisteredInfo.firstName }} {{ alreadyRegisteredInfo.lastName }}</strong> is already registered for this event.</p>
                <a [routerLink]="['/event', event!.id, 'confirmation', alreadyRegisteredInfo.id]" class="btn btn-primary btn-sm mt-2">
                  View Your QR Pass →
                </a>
              </div>
            </div>

            <!-- Submit Action -->
            <div class="submit-action-box">
              <button
                type="submit"
                [disabled]="regForm.invalid || isSubmitting || !!alreadyRegisteredInfo"
                class="btn btn-primary btn-block btn-lg"
              >
                <span *ngIf="!isSubmitting">Complete Registration & Get QR Pass →</span>
                <span *ngIf="isSubmitting">Processing Pass...</span>
              </button>
              <p class="text-xs text-center text-muted mt-2">
                🔒 Your unique QR token is generated locally. No sensitive personal data is encoded in the QR.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .public-reg-wrapper {
      padding: 2rem 1.25rem 4rem;
      min-height: 100vh;
    }
    .event-hero-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .event-banner-img {
      height: 200px;
      position: relative;
      overflow: hidden;
      padding: 1rem 1.25rem;
      background-repeat: no-repeat;
      background-color: #111;
    }
    .banner-top-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-pill {
      background: var(--flat-dark);
      color: var(--flat-white);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .hero-body {
      padding: 1.75rem;
    }
    .event-badge-label {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.35rem;
    }
    .event-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--flat-dark);
      line-height: 1.2;
    }
    .event-tagline {
      font-size: 1rem;
      color: var(--flat-gray-600);
      margin-top: 0.4rem;
    }
    .event-schedule-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    @media (max-width: 640px) {
      .event-schedule-grid { grid-template-columns: 1fr; }
    }
    .schedule-box {
      background: var(--flat-gray-50);
      border: 1px solid var(--flat-border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .s-icon { font-size: 1.25rem; }
    .s-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--flat-gray-500);
      text-transform: uppercase;
    }
    .s-val {
      font-size: 0.9rem;
      color: var(--flat-dark);
    }
    .deadline-strip {
      margin-top: 1.25rem;
      padding: 0.75rem 1rem;
      background: var(--flat-gray-100);
      border-radius: var(--radius-md);
    }
    .closed-alert {
      margin-top: 1.25rem;
      padding: 1rem;
      background: var(--flat-coral-light);
      color: var(--flat-coral-dark);
      border: 1px solid var(--flat-coral);
      border-radius: var(--radius-md);
      text-align: center;
    }
    .form-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
    }
    @media (max-width: 640px) {
      .form-card { padding: 1.25rem; }
    }
    .form-header {
      margin-bottom: 1.75rem;
    }
    .form-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .rsvp-decision-group {
      margin-bottom: 1.75rem;
      background: var(--flat-gray-50);
      border: 1.5px solid var(--flat-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .rsvp-options-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-top: 0.65rem;
    }
    @media (max-width: 640px) {
      .rsvp-options-grid { grid-template-columns: 1fr; }
    }
    .rsvp-card {
      border: 2px solid var(--flat-border);
      background: var(--flat-white);
      border-radius: var(--radius-md);
      padding: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .rsvp-card input { display: none; }
    .rsvp-card.selected {
      border-color: var(--flat-primary);
      background: var(--flat-primary-light);
      color: var(--flat-primary-dark);
    }
    .form-section-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--flat-dark);
      margin: 1.75rem 0 1rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid var(--flat-gray-200);
    }
    .custom-questions-section {
      margin-top: 1.5rem;
    }
    .custom-q-row {
      margin-bottom: 1.25rem;
    }
    .radio-options-stack, .checkbox-options-stack {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.4rem;
    }
    .choice-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .yes-no-group {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.4rem;
    }
    .already-registered-banner {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-top: 1.5rem;
      padding: 1.25rem;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: var(--radius-lg);
    }
    .already-reg-icon {
      font-size: 1.75rem;
      flex-shrink: 0;
      line-height: 1;
    }
    .already-reg-body {
      flex: 1;
    }
    .already-reg-body strong {
      font-size: 1rem;
      color: #166534;
    }
    .already-reg-body p {
      font-size: 0.875rem;
      color: #166534;
      margin: 0.25rem 0 0;
    }
    .submit-action-box {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--flat-border);
    }
    .custom-mapped-fields-grid {
      margin-top: 0.5rem;
    }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class PublicRegistrationComponent implements OnInit {
  event?: Event;
  customQuestions: CustomQuestion[] = [];
  regForm!: FormGroup;
  selectedRsvp: RSVPStatus = 'attending';
  customAnswersMap: Record<string, any> = {};
  customMappedAnswersMap: Record<string, any> = {};
  customMappedFields: Array<{ key: string; label: string }> = [];
  configuredFieldsMap: Record<string, { label: string; active: boolean }> = {};
  orderedFields: Array<{ key: string; label: string; isCustom?: boolean; isPrimaryKey?: boolean }> = [];
  primaryKeyColumnKey = '';
  hasEventSpecificConfig = false;
  isSubmitting = false;
  alreadyRegisteredInfo: Registration | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId) {
      this.loadEvent(eventId);
      this.loadEventFieldConfiguration(eventId);
    }
    this.initForm();
    this.regForm.valueChanges.subscribe(() => {
      this.alreadyRegisteredInfo = null;
    });
  }

  private loadEvent(id: string): void {
    this.event = this.eventService.getEventById(id);
    if (!this.event) {
      this.toastService.error('Event Not Found', 'The requested event is not available.');
      this.router.navigate(['/']);
      return;
    }
    this.customQuestions = this.eventService.getCustomQuestionsForEvent(id);
  }

  private loadEventFieldConfiguration(eventId: string): void {
    try {
      const saved = localStorage.getItem(`evently_app_mapping_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.mappingRows) && parsed.mappingRows.length > 0) {
          this.hasEventSpecificConfig = true;
          this.configuredFieldsMap = {};
          this.customMappedFields = [];
          this.primaryKeyColumnKey = parsed.primaryKeyColumnKey || '';

          const rawOrdered: Array<{ key: string; label: string; isCustom?: boolean; isPrimaryKey?: boolean }> = [];

          for (const r of parsed.mappingRows) {
            const isPk = (this.primaryKeyColumnKey === r.key);
            if (r.isCustom) {
              this.customMappedFields.push({
                key: r.key,
                label: r.label || 'Custom Attribute'
              });
              rawOrdered.push({
                key: r.key,
                label: r.label || 'Custom Attribute',
                isCustom: true,
                isPrimaryKey: isPk
              });
            } else {
              this.configuredFieldsMap[r.key] = {
                label: r.label,
                active: true
              };
              rawOrdered.push({
                key: r.key,
                label: r.label,
                isCustom: false,
                isPrimaryKey: isPk
              });
            }
          }

          // Prioritize the Primary Key to appear at the very first part of the form
          this.orderedFields = rawOrdered.sort((a, b) => {
            if (a.isPrimaryKey) return -1;
            if (b.isPrimaryKey) return 1;
            return 0;
          });
          return;
        }
      }
    } catch {
      this.hasEventSpecificConfig = false;
    }

    // Default fallback order if no custom mapping exists
    this.orderedFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email Address' },
      { key: 'phone', label: 'Mobile / Phone' },
      { key: 'company', label: 'Company / Organization' },
      { key: 'jobTitle', label: 'Job Title / Role' },
      { key: 'dietary', label: 'Dietary Preferences' }
    ];
  }

  hasField(fieldKey: string): boolean {
    if (!this.hasEventSpecificConfig) {
      // If no custom column schema was defined for this event, show default registration fields
      return fieldKey !== 'fullName';
    }
    return !!this.configuredFieldsMap[fieldKey]?.active;
  }

  getFieldLabel(fieldKey: string, fallback: string): string {
    if (this.hasEventSpecificConfig && this.configuredFieldsMap[fieldKey]?.label) {
      return this.configuredFieldsMap[fieldKey].label;
    }
    return fallback;
  }

  private initForm(): void {
    this.regForm = this.fb.group({
      fullName: [''],
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      company: [''],
      jobTitle: [''],
      dietaryPreferences: ['']
    });
  }

  get isRegistrationOpen(): boolean {
    if (!this.event) return false;
    return this.event.status === 'registration-open' || this.event.status === 'ongoing';
  }

  get remainingSlots(): number {
    if (!this.event) return 0;
    const current = this.registrationService.getRegistrationsForEvent(this.event.id).length;
    return Math.max(0, this.event.capacity - current);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.regForm.get(field);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  isCheckboxOptionSelected(questionId: string, option: string): boolean {
    const current = this.customAnswersMap[questionId];
    if (Array.isArray(current)) {
      return current.includes(option);
    }
    return false;
  }

  toggleCheckboxOption(questionId: string, option: string, event: any): void {
    const checked = event.target.checked;
    let current = this.customAnswersMap[questionId] || [];
    if (!Array.isArray(current)) current = [];

    if (checked) {
      if (!current.includes(option)) current.push(option);
    } else {
      current = current.filter((item: string) => item !== option);
    }
    this.customAnswersMap[questionId] = [...current];
  }

  onSubmit(): void {
    if (!this.event) return;

    const formVal = this.regForm.value;

    // Check that all configured fields in this event schema have values entered
    for (const field of this.orderedFields) {
      if (field.isCustom) {
        const customVal = this.customMappedAnswersMap[field.key];
        if (!customVal || !String(customVal).trim()) {
          this.toastService.error('Required Field', `Please fill out "${field.label}"`);
          return;
        }
      } else {
        const val = formVal[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          this.toastService.error('Required Field', `Please fill out "${field.label}"`);
          return;
        }
      }
    }

    let firstName = formVal.firstName ? formVal.firstName.trim() : '';
    let lastName = formVal.lastName ? formVal.lastName.trim() : '';

    // If full name field was used
    if (!firstName && formVal.fullName) {
      const parts = formVal.fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    // If no name fields were provided at all, assign a friendly guest placeholder
    if (!firstName && !lastName) {
      // Check if custom ID exists to label the guest
      const anyCustom = Object.values(this.customMappedAnswersMap)[0];
      firstName = anyCustom ? String(anyCustom) : 'Guest';
      lastName = 'Attendee';
    }

    // Verify required custom questions
    for (const q of this.customQuestions) {
      if (q.required) {
        const ans = this.customAnswersMap[q.id];
        if (ans === undefined || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
          this.toastService.error('Required Question', `Please answer "${q.question}"`);
          return;
        }
      }
    }

    const email = formVal.email ? formVal.email.trim() : '';

    // Check duplicate by primary key (custom mapped field)
    if (this.primaryKeyColumnKey) {
      const pkValue = this.primaryKeyColumnKey && this.customMappedAnswersMap[this.primaryKeyColumnKey]
        ? String(this.customMappedAnswersMap[this.primaryKeyColumnKey]).trim().toLowerCase()
        : '';
      if (pkValue) {
        const existingByPk = this.registrationService.getRegistrationsForEvent(this.event.id).find(r =>
          r.customAnswers?.some((ca: any) =>
            ca.questionId === this.primaryKeyColumnKey &&
            String(ca.answer).trim().toLowerCase() === pkValue
          )
        );
        if (existingByPk) {
          this.alreadyRegisteredInfo = existingByPk;
          return;
        }
      }
    }

    // Check duplicate by email
    if (email && this.registrationService.checkDuplicateRegistration(this.event.id, email)) {
      const existing = this.registrationService.getRegistrationsForEvent(this.event.id).find(r => r.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        this.alreadyRegisteredInfo = existing;
        return;
      }
    }

    this.isSubmitting = true;

    // Combine event custom questions and custom mapped fields (e.g. ID number)
    const formattedAnswers: any[] = this.customQuestions.map(q => ({
      questionId: q.id,
      questionText: q.question,
      answer: this.customAnswersMap[q.id] || 'N/A'
    }));

    for (const cf of this.customMappedFields) {
      if (this.customMappedAnswersMap[cf.key]) {
        formattedAnswers.push({
          questionId: cf.key,
          questionText: cf.label,
          answer: String(this.customMappedAnswersMap[cf.key]).trim()
        });
      }
    }

    const reg = this.registrationService.registerGuest({
      eventId: this.event.id,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: formVal.phone,
      company: formVal.company,
      jobTitle: formVal.jobTitle,
      dietaryPreferences: formVal.dietaryPreferences,
      rsvpStatus: this.selectedRsvp,
      customAnswers: formattedAnswers
    });

    this.isSubmitting = false;
    this.toastService.success('Registration Confirmed!', 'Your QR Pass is ready.');
    this.router.navigate(['/event', this.event.id, 'confirmation', reg.id]);
  }
}
