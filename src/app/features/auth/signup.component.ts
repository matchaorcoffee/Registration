import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="signup-wrapper">
      <div class="signup-card">
        <div class="signup-header">
          <div class="signup-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h2>Create Organizer Account</h2>
          <p class="text-muted">Start hosting and managing events, ticketing, QR check-ins, and attendee lists with Evently.</p>
        </div>

        <form [formGroup]="signupForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="name">
              Full Name <span class="required-star">*</span>
            </label>
            <input 
              id="name" 
              type="text" 
              class="form-control" 
              [class.is-invalid]="signupForm.get('name')?.touched && signupForm.get('name')?.invalid"
              formControlName="name" 
              placeholder="e.g. Jordan Mitchell" 
            />
            <div *ngIf="signupForm.get('name')?.touched && signupForm.get('name')?.invalid" class="form-error">
              Please enter your full name (at least 2 characters).
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">
              Organizer Work Email <span class="required-star">*</span>
            </label>
            <input
              id="email"
              type="email"
              class="form-control"
              [class.is-invalid]="(signupForm.get('email')?.touched && signupForm.get('email')?.invalid) || emailTaken"
              formControlName="email"
              placeholder="e.g. jordan@techsummit.org"
            />
            <div *ngIf="signupForm.get('email')?.touched && signupForm.get('email')?.invalid" class="form-error">
              Please enter a valid email address.
            </div>
            <div *ngIf="emailTaken" class="form-error">
              This email is already registered. <a routerLink="/login">Sign in instead?</a>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label" for="password">
                Password <span class="required-star">*</span>
              </label>
              <input 
                id="password" 
                type="password" 
                class="form-control" 
                [class.is-invalid]="signupForm.get('password')?.touched && signupForm.get('password')?.invalid"
                formControlName="password" 
                placeholder="••••••••" 
              />
              <div *ngIf="signupForm.get('password')?.touched && signupForm.get('password')?.invalid" class="form-error">
                Min 6 characters.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmPassword">
                Confirm Password <span class="required-star">*</span>
              </label>
              <input 
                id="confirmPassword" 
                type="password" 
                class="form-control" 
                [class.is-invalid]="signupForm.hasError('mismatch') && signupForm.get('confirmPassword')?.touched"
                formControlName="confirmPassword" 
                placeholder="••••••••" 
              />
              <div *ngIf="signupForm.hasError('mismatch') && signupForm.get('confirmPassword')?.touched" class="form-error">
                Passwords must match.
              </div>
            </div>
          </div>

          <div class="mt-4">
            <button type="submit" [disabled]="signupForm.invalid || isLoading" class="btn btn-primary btn-block btn-lg">
              <span *ngIf="!isLoading">Create Organizer Account →</span>
              <span *ngIf="isLoading">Setting Up Workspace...</span>
            </button>
          </div>
        </form>

        <div class="signup-footer">
          <p>Already have an organizer account? <a routerLink="/login">Sign In here</a></p>
          <p class="mt-2 text-xs">Looking to retrieve an attendee RSVP? <a routerLink="/registration">Find RSVP Here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signup-wrapper {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.25rem;
    }
    .signup-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
      width: 100%;
      max-width: 480px;
    }
    .signup-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .signup-logo-icon {
      width: 48px;
      height: 48px;
      background: var(--flat-emerald);
      color: var(--flat-white);
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.85rem;
    }
    .signup-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .signup-header p {
      font-size: 0.85rem;
      margin-top: 0.35rem;
      line-height: 1.4;
    }
    .signup-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--flat-border);
      font-size: 0.825rem;
      color: var(--flat-gray-600);
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .mt-2 {
      margin-top: 0.5rem;
    }
  `]
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  emailTaken = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.signupForm.get('email')!.valueChanges.subscribe(() => {
      this.emailTaken = false;
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { mismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.toastService.error('Form Incomplete', 'Please fill in all required fields properly.');
      return;
    }

    const { name, email, password } = this.signupForm.value;

    if (this.authService.emailExists(email)) {
      this.emailTaken = true;
      this.signupForm.get('email')?.markAsTouched();
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      this.authService.registerOrganizer({ name, email, password });
      this.isLoading = false;
      this.toastService.success('Account Created!', `Welcome, ${name}! Your organizer workspace is ready.`);
      this.router.navigate(['/dashboard']);
    }, 400);
  }
}
