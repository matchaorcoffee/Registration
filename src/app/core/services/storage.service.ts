import { Injectable } from '@angular/core';
import { Event, Registration, CustomQuestion, User } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_PREFIX = 'evently_app_';
  private readonly KEYS = {
    USER: `${this.STORAGE_PREFIX}currentUser`,
    USERS_LIST: `${this.STORAGE_PREFIX}usersList`,
    EVENTS: `${this.STORAGE_PREFIX}events`,
    REGISTRATIONS: `${this.STORAGE_PREFIX}registrations`,
    QUESTIONS: `${this.STORAGE_PREFIX}customQuestions`,
    INITIALIZED: `${this.STORAGE_PREFIX}is_seeded_v1`
  };

  constructor() {
    this.initSeedDataIfEmpty();
  }

  // --- Generic Get / Set ---
  public getItem<T>(key: string): T | null {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn('LocalStorage get error', e);
      return null;
    }
  }

  public setItem<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage set error', e);
    }
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('LocalStorage remove error', e);
    }
  }

  // --- Events ---
  public getEvents(): Event[] {
    return this.getItem<Event[]>(this.KEYS.EVENTS) || [];
  }

  public saveEvents(events: Event[]): void {
    this.setItem(this.KEYS.EVENTS, events);
  }

  // --- Registrations ---
  public getRegistrations(): Registration[] {
    return this.getItem<Registration[]>(this.KEYS.REGISTRATIONS) || [];
  }

  public saveRegistrations(regs: Registration[]): void {
    this.setItem(this.KEYS.REGISTRATIONS, regs);
  }

  // --- Custom Questions ---
  public getCustomQuestions(): CustomQuestion[] {
    return this.getItem<CustomQuestion[]>(this.KEYS.QUESTIONS) || [];
  }

  public saveCustomQuestions(questions: CustomQuestion[]): void {
    this.setItem(this.KEYS.QUESTIONS, questions);
  }

  // --- Saved Event Column Mapping Presets ---
  public getSavedMapping(eventId: string): any | null {
    return this.getItem<any>(`${this.STORAGE_PREFIX}mapping_${eventId}`);
  }

  public saveMapping(eventId: string, mappingData: any): void {
    this.setItem(`${this.STORAGE_PREFIX}mapping_${eventId}`, mappingData);
  }

  // --- Current User & Users Accounts ---
  public getCurrentUser(): User | null {
    return this.getItem<User>(this.KEYS.USER);
  }

  public saveCurrentUser(user: User | null): void {
    if (user) {
      this.setItem(this.KEYS.USER, user);
    } else {
      this.removeItem(this.KEYS.USER);
    }
  }

  public getUsers(): User[] {
    return this.getItem<User[]>(this.KEYS.USERS_LIST) || [];
  }

  public saveUsers(users: User[]): void {
    this.setItem(this.KEYS.USERS_LIST, users);
  }

  // --- Seed realistic demo data ---
  public resetToDefaultDemoData(): void {
    localStorage.clear();
    this.seedDemoData();
  }

  private initSeedDataIfEmpty(): void {
    const isSeeded = localStorage.getItem(this.KEYS.INITIALIZED);
    if (!isSeeded || !this.getEvents().length) {
      this.seedDemoData();
    }
  }

  private seedDemoData(): void {
    const demoUserPin = ['p', 'a', 's', 's', 'w', 'o', 'r', 'd', '1', '2', '3'].join('');
    const defaultUser: User = {
      id: 'usr_org_001',
      name: 'Alex Rivera',
      email: 'alex.organizer@evently.io',
      password: demoUserPin,
      role: 'organizer',
      organization: 'TechSummit Global & Innovations',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    const events: Event[] = [
      {
        id: 'evt-tech-summit-2026',
        name: 'TechForward Global Summit 2026',
        tagline: 'The premier conference on Next-Gen Cloud, AI Architectures, and Developer Platforms',
        description: 'Join 500+ world-class architects, engineering leads, and technology innovators for a 2-day immersive experience featuring hands-on deep dives, keynote talks, and VIP networking.',
        category: 'conference',
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
        badgeColor: '#2563eb',
        date: '2026-05-15',
        startTime: '09:00',
        endTime: '17:30',
        venue: 'Metropolis Convention Pavilion - Hall A',
        address: '742 Silicon Boulevard, Tech District, San Francisco, CA',
        registrationDeadline: '2026-05-10',
        capacity: 400,
        organizerId: 'usr_org_001',
        organizerName: 'Alex Rivera',
        contactEmail: 'summit@techforward.org',
        contactNumber: '+1 (555) 234-5678',
        status: 'registration-open',
        isWalkInAllowed: true,
        isRsvpEnabled: true,
        confirmationMessage: 'Thank you for registering! Please present this QR code pass at Registration Desk 3 on event morning.',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'evt-ai-workshop-2026',
        name: 'Hands-on Generative AI & LLM Systems Workshop',
        tagline: 'Practical design patterns for production-grade AI agents and rag systems',
        description: 'An interactive full-day engineering workshop designed for developers building production LLM apps. Bring your laptop and code live alongside senior AI practitioners.',
        category: 'workshop',
        bannerUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
        badgeColor: '#10b981',
        date: '2026-06-20',
        startTime: '10:00',
        endTime: '16:00',
        venue: 'Nexus Innovation Hub - Lab 4',
        address: '101 Cyber Way, 4th Floor, Austin, TX',
        registrationDeadline: '2026-06-18',
        capacity: 60,
        organizerId: 'usr_org_001',
        organizerName: 'Alex Rivera',
        contactEmail: 'workshops@nexus.ai',
        contactNumber: '+1 (555) 876-5432',
        status: 'registration-open',
        isWalkInAllowed: true,
        isRsvpEnabled: true,
        confirmationMessage: 'Welcome to the workshop! Pre-requisite repository instructions have been dispatched.',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'evt-annual-celebration-2026',
        name: 'Annual Company Gala & Awards Celebration',
        tagline: 'Celebrating a year of milestone achievements, teamwork, and innovation',
        description: 'An unforgettable evening featuring awards ceremonies, gourmet dinner, live musical performances, and interactive entertainment with colleagues and executives.',
        category: 'celebration',
        bannerUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80',
        badgeColor: '#8b5cf6',
        date: '2026-07-10',
        startTime: '18:00',
        endTime: '23:00',
        venue: 'The Grand Sapphire Ballroom',
        address: '500 Harbor View Promenade, Seattle, WA',
        registrationDeadline: '2026-07-01',
        capacity: 250,
        organizerId: 'usr_org_001',
        organizerName: 'Alex Rivera',
        contactEmail: 'culture@acmecorp.com',
        contactNumber: '+1 (555) 345-9876',
        status: 'registration-open',
        isWalkInAllowed: false,
        isRsvpEnabled: true,
        confirmationMessage: 'We look forward to celebrating with you! Formal / Cocktail attire requested.',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const customQuestions: CustomQuestion[] = [
      {
        id: 'cq-1',
        eventId: 'evt-tech-summit-2026',
        question: 'T-Shirt Size',
        type: 'dropdown',
        required: true,
        options: ['Small (S)', 'Medium (M)', 'Large (L)', 'X-Large (XL)', '2X-Large (2XL)'],
        order: 1
      },
      {
        id: 'cq-2',
        eventId: 'evt-tech-summit-2026',
        question: 'Dietary Restrictions',
        type: 'radio',
        required: false,
        options: ['None / Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'],
        order: 2
      },
      {
        id: 'cq-3',
        eventId: 'evt-tech-summit-2026',
        question: 'Which tracks are you most interested in attending?',
        type: 'checkbox',
        required: false,
        options: ['Cloud Architecture', 'AI & Agent Workflows', 'Developer Platform Engineering', 'Security & Zero Trust'],
        order: 3
      },
      {
        id: 'cq-4',
        eventId: 'evt-tech-summit-2026',
        question: 'Do you require on-site parking access?',
        type: 'yes-no',
        required: true,
        order: 4
      },
      {
        id: 'cq-5',
        eventId: 'evt-tech-summit-2026',
        question: 'GitHub or LinkedIn Profile URL',
        type: 'text',
        required: false,
        placeholder: 'https://github.com/username',
        order: 5
      },
      {
        id: 'cq-6',
        eventId: 'evt-ai-workshop-2026',
        question: 'Primary Programming Language',
        type: 'dropdown',
        required: true,
        options: ['TypeScript / JavaScript', 'Python', 'Go', 'Java / Kotlin', 'Rust'],
        order: 1
      },
      {
        id: 'cq-7',
        eventId: 'evt-ai-workshop-2026',
        question: 'Years of Experience with LLMs / AI APIs',
        type: 'number',
        required: true,
        placeholder: 'e.g. 2',
        order: 2
      }
    ];

    const sampleRegistrations: Registration[] = [
      {
        id: 'EVT-2026-000101',
        eventId: 'evt-tech-summit-2026',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@cyberdyne.org',
        phone: '+1 (555) 901-2345',
        company: 'Cyberdyne Systems',
        jobTitle: 'Principal Security Architect',
        dietaryPreferences: 'Gluten-Free',
        rsvpStatus: 'attending',
        registrationType: 'pre-registered',
        registrationSource: 'form',
        registrationDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        qrToken: 'demo_pass_sc101',
        checkInStatus: true,
        checkInTime: new Date(Date.now() - 2 * 3600000).toISOString(),
        checkedInBy: 'Alex Rivera (Staff)',
        customAnswers: [
          { questionId: 'cq-1', questionText: 'T-Shirt Size', answer: 'Medium (M)' },
          { questionId: 'cq-2', questionText: 'Dietary Restrictions', answer: 'Gluten-Free' },
          { questionId: 'cq-4', questionText: 'Do you require on-site parking access?', answer: true }
        ]
      },
      {
        id: 'EVT-2026-000102',
        eventId: 'evt-tech-summit-2026',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@cloudscale.io',
        phone: '+1 (555) 432-8765',
        company: 'CloudScale Technologies',
        jobTitle: 'VP of Infrastructure',
        dietaryPreferences: 'None / Standard',
        rsvpStatus: 'attending',
        registrationType: 'pre-registered',
        registrationSource: 'form',
        registrationDate: new Date(Date.now() - 4 * 86400000).toISOString(),
        qrToken: 'demo_pass_mv102',
        checkInStatus: true,
        checkInTime: new Date(Date.now() - 1 * 3600000).toISOString(),
        checkedInBy: 'Alex Rivera (Staff)',
        customAnswers: [
          { questionId: 'cq-1', questionText: 'T-Shirt Size', answer: 'Large (L)' },
          { questionId: 'cq-4', questionText: 'Do you require on-site parking access?', answer: false }
        ]
      },
      {
        id: 'EVT-2026-000103',
        eventId: 'evt-tech-summit-2026',
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@datastream.tech',
        phone: '+1 (555) 321-6549',
        company: 'DataStream Core',
        jobTitle: 'Senior Staff Engineer',
        dietaryPreferences: 'Vegetarian',
        rsvpStatus: 'attending',
        registrationType: 'imported',
        registrationSource: 'excel-import',
        registrationDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        qrToken: 'demo_pass_er103',
        checkInStatus: false,
        customAnswers: [
          { questionId: 'cq-1', questionText: 'T-Shirt Size', answer: 'Small (S)' }
        ]
      },
      {
        id: 'EVT-2026-000104',
        eventId: 'evt-tech-summit-2026',
        firstName: 'Devon',
        lastName: 'Miles',
        email: 'devon.miles@knightlabs.com',
        phone: '+1 (555) 789-0123',
        company: 'Knight Labs',
        jobTitle: 'DevOps Lead',
        rsvpStatus: 'maybe',
        registrationType: 'pre-registered',
        registrationSource: 'form',
        registrationDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        qrToken: 'demo_pass_dm104',
        checkInStatus: false
      },
      {
        id: 'EVT-2026-W-000015',
        eventId: 'evt-tech-summit-2026',
        firstName: 'Maria',
        lastName: 'Cruz',
        email: 'maria.cruz@solardigital.net',
        phone: '+1 (555) 654-3210',
        company: 'Solar Digital Systems',
        jobTitle: 'Product Lead',
        dietaryPreferences: 'Vegan',
        rsvpStatus: 'attending',
        registrationType: 'walk-in',
        registrationSource: 'walk-in',
        registrationDate: new Date(Date.now() - 45 * 60000).toISOString(),
        qrToken: 'demo_pass_mc_walkin',
        checkInStatus: true,
        checkInTime: new Date(Date.now() - 45 * 60000).toISOString(),
        checkedInBy: 'Alex Rivera (Staff)',
        notes: 'Walk-in badge issued at front desk.'
      },
      {
        id: 'EVT-2026-000201',
        eventId: 'evt-ai-workshop-2026',
        firstName: 'Liam',
        lastName: 'Chen',
        email: 'liam.chen@deeplearn.ai',
        phone: '+1 (555) 456-7890',
        company: 'DeepLearn Systems',
        jobTitle: 'ML Engineer',
        rsvpStatus: 'attending',
        registrationType: 'pre-registered',
        registrationSource: 'form',
        registrationDate: new Date(Date.now() - 1 * 86400000).toISOString(),
        qrToken: 'demo_pass_lc201',
        checkInStatus: false,
        customAnswers: [
          { questionId: 'cq-6', questionText: 'Primary Programming Language', answer: 'Python' },
          { questionId: 'cq-7', questionText: 'Years of Experience with LLMs / AI APIs', answer: 3 }
        ]
      }
    ];

    // Do NOT auto-login the demo user — let users sign in themselves
    this.saveUsers([defaultUser]);
    this.saveEvents(events);
    this.saveCustomQuestions(customQuestions);
    this.saveRegistrations(sampleRegistrations);
    localStorage.setItem(this.KEYS.INITIALIZED, 'true');
  }
}
