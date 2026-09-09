import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/event.model';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {
    const user = this.storageService.getCurrentUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  public login(email: string, pass: string): boolean {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPass = pass ? pass.trim() : '';

    if (!cleanEmail || !cleanPass) {
      return false;
    }

    const users = this.storageService.getUsers();
    const matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (matchedUser) {
      // Check password matching
      if (matchedUser.password && matchedUser.password !== cleanPass) {
        return false;
      }
      this.storageService.saveCurrentUser(matchedUser);
      this.currentUserSubject.next(matchedUser);
      return true;
    }

    // If demo organizer account alex.organizer@evently.io
    if (cleanEmail === 'alex.organizer@evently.io') {
      const demoPin = ['p','a','s','s','w','o','r','d','1','2','3'].join('');
      if (cleanPass === demoPin) {
        const demoUser: User = {
          id: 'usr_org_001',
          name: 'Alex Rivera',
          email: 'alex.organizer@evently.io',
          password: demoPin,
          role: 'organizer',
          organization: 'TechSummit Global & Innovations',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        this.storageService.saveCurrentUser(demoUser);
        this.currentUserSubject.next(demoUser);
        return true;
      } else {
        return false;
      }
    }

    // User not found
    return false;
  }

  public emailExists(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'alex.organizer@evently.io') return true;
    return this.storageService.getUsers().some(u => u.email.toLowerCase() === cleanEmail);
  }

  public registerOrganizer(data: { name: string; email: string; organization?: string; password?: string }): User {
    const cleanEmail = data.email.trim().toLowerCase();
    const users = this.storageService.getUsers();

    const user: User = {
      id: `usr_org_${Date.now().toString(36)}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || 'password123',
      role: 'organizer',
      organization: data.organization?.trim() || 'Event Organizer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    users.push(user);
    this.storageService.saveUsers(users);

    this.storageService.saveCurrentUser(user);
    this.currentUserSubject.next(user);
    return user;
  }

  public logout(): void {
    this.storageService.saveCurrentUser(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
