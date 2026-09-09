import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/>
              <path d="m9 16 2 2 4-4"/>
            </svg>
          </div>
          <h2>Organizer Sign In</h2>
          <p class="text-muted">Sign in to manage events, scan attendee QR codes, and import spreadsheets.</p>
        </div>

        <!-- Quick Demo Account Fill Banner -->
        <div class="demo-account-box">
          <div class="flex justify-between items-center">
            <div>
              <span class="demo-tag">DEMO CREDENTIALS</span>
              <p class="demo-user-text">alex.organizer&#64;evently.io</p>
            </div>
            <button type="button" (click)="fillDemoCredentials()" class="btn btn-sm btn-outline">
              Auto-Fill
            </button>
          </div>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="email">
              Organizer Email Address <span class="required-star">*</span>
            </label>
            <input 
              id="email" 
              type="email" 
              class="form-control" 
              [class.is-invalid]="loginForm.get('email')?.touched && loginForm.get('email')?.invalid"
              formControlName="email" 
              placeholder="e.g. organizer@evently.io" 
            />
            <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="form-error">
              Please enter a valid organizer email.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">
              Password <span class="required-star">*</span>
            </label>
            <input 
              id="password" 
              type="password" 
              class="form-control" 
              [class.is-invalid]="loginForm.get('password')?.touched && loginForm.get('password')?.invalid"
              formControlName="password" 
              placeholder="••••••••" 
            />
            <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="form-error">
              Password is required (minimum 6 characters for demo).
            </div>
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading" class="btn btn-primary btn-block btn-lg">
            <span *ngIf="!isLoading">Sign In to Dashboard →</span>
            <span *ngIf="isLoading">Verifying Session...</span>
          </button>
        </form>

        <div class="login-footer">
          <p>Don't have an organizer account? <a routerLink="/signup">Sign Up for free</a></p>
          <p class="mt-2 text-xs">Looking to retrieve your RSVP pass? <a routerLink="/registration">Find RSVP Here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
    }
    .login-card {
      background: var(--flat-white);
      border: 2px solid var(--flat-dark);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
      width: 100%;
      max-width: 440px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .login-logo-icon {
      width: 48px;
      height: 48px;
      background: var(--flat-primary);
      color: var(--flat-white);
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.85rem;
    }
    .login-header h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--flat-dark);
    }
    .login-header p {
      font-size: 0.875rem;
      margin-top: 0.35rem;
    }
    .demo-account-box {
      background: var(--flat-gray-50);
      border: 1.5px dashed var(--flat-primary);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
    }
    .demo-tag {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--flat-primary);
      letter-spacing: 0.05em;
    }
    .demo-user-text {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--flat-gray-800);
      font-family: var(--font-mono);
      margin-top: 0.15rem;
    }
    .login-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--flat-border);
      font-size: 0.825rem;
      color: var(--flat-gray-600);
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  returnUrl = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['alex.organizer@evently.io', [Validators.required, Validators.email]],
      password: ['password123', [Validators.required, Validators.minLength(4)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  fillDemoCredentials(): void {
    this.loginForm.patchValue({
      email: 'alex.organizer@evently.io',
      password: 'password123'
    });
    this.toastService.info('Filled', 'Demo credentials loaded into form.');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    setTimeout(() => {
      const ok = this.authService.login(email, password);
      this.isLoading = false;
      if (ok) {
        this.toastService.success('Welcome Back', 'Signed in successfully.');
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.toastService.error('Sign In Failed', 'Incorrect email or password. Please try again.');
      }
    }, 400);
  }
}
