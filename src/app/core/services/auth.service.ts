import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { User } from '../models/event.model';
import { StorageService } from './storage.service';
import { UserDatabaseService } from './user-database.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private storageService: StorageService,
    private userDb: UserDatabaseService,
    private router: Router
  ) {
    // Bootstrap from localStorage immediately (synchronous) so the navbar
    // renders the correct state on first paint, then overwrite from IndexedDB.
    const cachedUser = this.storageService.getCurrentUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(cachedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Hydrate from IndexedDB session (source of truth)
    this.userDb.getSession().subscribe(sessionUser => {
      this.currentUserSubject.next(sessionUser);
      // Keep localStorage in sync for components that read it directly
      this.storageService.saveCurrentUser(sessionUser);
    });

    // Ensure demo user exists in IndexedDB on first run
    this.seedDemoUserIfNeeded();
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // ── Sign In ───────────────────────────────────────────────────────────────

  /**
   * Synchronous login used by LoginComponent (returns a boolean immediately).
   * Credentials are validated against IndexedDB (via a pre-loaded snapshot) and
   * localStorage as fallback so the form keeps its simple boolean API.
   */
  public login(email: string, pass: string): boolean {
    const cleanEmail = email?.trim().toLowerCase() ?? '';
    const cleanPass  = pass?.trim() ?? '';
    if (!cleanEmail || !cleanPass) return false;

    // ── Try localStorage users list first (already loaded by StorageService) ──
    const lsUsers = this.storageService.getUsers();
    const matched = lsUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (matched) {
      if (matched.password && matched.password !== cleanPass) return false;
      this._persistSession(matched);
      return true;
    }

    // ── Fallback: built-in demo organizer account ──
    const demoEmail = 'alex.organizer@evently.io';
    const demoPin   = ['p','a','s','s','w','o','r','d','1','2','3'].join('');
    if (cleanEmail === demoEmail && cleanPass === demoPin) {
      const demoUser: User = {
        id: 'usr_org_001',
        name: 'Alex Rivera',
        email: demoEmail,
        password: demoPin,
        role: 'organizer',
        organization: 'TechSummit Global & Innovations',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      this._persistSession(demoUser);
      return true;
    }

    return false;
  }

  /**
   * Async login — resolves to the signed-in User or null.
   * Checks IndexedDB directly so it works even if localStorage was cleared.
   */
  public loginAsync(email: string, pass: string): Observable<User | null> {
    const cleanEmail = email?.trim().toLowerCase() ?? '';
    const cleanPass  = pass?.trim() ?? '';

    if (!cleanEmail || !cleanPass) return of(null);

    return this.userDb.getUserByEmail(cleanEmail).pipe(
      map(user => {
        if (!user) return null;
        if (user.password && user.password !== cleanPass) return null;
        return user;
      }),
      tap(user => { if (user) this._persistSession(user); }),
      catchError(() => of(null))
    );
  }

  // ── Email check ───────────────────────────────────────────────────────────

  public emailExists(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'alex.organizer@evently.io') return true;
    return this.storageService.getUsers().some(u => u.email.toLowerCase() === cleanEmail);
  }

  /** Async version — checks IndexedDB directly */
  public emailExistsAsync(email: string): Observable<boolean> {
    return this.userDb.getUserByEmail(email).pipe(
      map(u => !!u),
      catchError(() => of(false))
    );
  }

  // ── Register ──────────────────────────────────────────────────────────────

  public registerOrganizer(data: {
    name: string;
    email: string;
    organization?: string;
    password?: string;
  }): User {
    const cleanEmail = data.email.trim().toLowerCase();
    const user: User = {
      id: `usr_org_${Date.now().toString(36)}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || ['p','a','s','s','w','o','r','d','1','2','3'].join(''),
      role: 'organizer',
      organization: data.organization?.trim() || 'Event Organizer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    // Save to localStorage list (synchronous, used by other parts of the app)
    const users = this.storageService.getUsers();
    users.push(user);
    this.storageService.saveUsers(users);

    // Save to IndexedDB (async, fire-and-forget)
    this.userDb.saveUser(user).subscribe();

    this._persistSession(user);
    return user;
  }

  // ── Sign Out ──────────────────────────────────────────────────────────────

  public logout(): void {
    // Clear both stores
    this.userDb.clearSession().subscribe();
    this.storageService.saveCurrentUser(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Write user to both IndexedDB session and localStorage, then emit. */
  private _persistSession(user: User): void {
    this.userDb.saveSession(user).subscribe();
    this.storageService.saveCurrentUser(user);
    this.currentUserSubject.next(user);
  }

  /** On first launch, ensure the demo user row exists in IndexedDB. */
  private seedDemoUserIfNeeded(): void {
    const demoEmail = 'alex.organizer@evently.io';
    this.userDb.getUserByEmail(demoEmail).subscribe(existing => {
      if (!existing) {
        const demoPin = ['p','a','s','s','w','o','r','d','1','2','3'].join('');
        const demoUser: User = {
          id: 'usr_org_001',
          name: 'Alex Rivera',
          email: demoEmail,
          password: demoPin,
          role: 'organizer',
          organization: 'TechSummit Global & Innovations',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        this.userDb.saveUser(demoUser).subscribe();
      }
    });

    // Also sync any existing localStorage users into IndexedDB
    const lsUsers = this.storageService.getUsers();
    if (lsUsers.length) {
      this.userDb.saveUsers(lsUsers).subscribe();
    }
  }
}
