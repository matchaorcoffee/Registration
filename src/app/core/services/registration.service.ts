import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Registration, RSVPStatus, RegistrationType, RegistrationSource } from '../models/event.model';
import { StorageService } from './storage.service';
import { QRCodeService } from './qrcode.service';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private registrationsSubject: BehaviorSubject<Registration[]>;
  public registrations$: Observable<Registration[]>;

  constructor(
    private storageService: StorageService,
    private qrCodeService: QRCodeService
  ) {
    const regs = this.storageService.getRegistrations();
    this.registrationsSubject = new BehaviorSubject<Registration[]>(regs);
    this.registrations$ = this.registrationsSubject.asObservable();
  }

  public getRegistrations(): Registration[] {
    return this.storageService.getRegistrations();
  }

  /** Re-read from localStorage and push to subscribers — used when another tab writes data */
  public refreshFromStorage(): void {
    const regs = this.storageService.getRegistrations();
    this.registrationsSubject.next(regs);
  }

  public getRegistrationsForEvent(eventId: string): Registration[] {
    return this.getRegistrations().filter(r => r.eventId === eventId);
  }

  public getRegistrationById(id: string): Registration | undefined {
    return this.getRegistrations().find(r => r.id.toLowerCase() === id.trim().toLowerCase());
  }

  public getRegistrationByToken(token: string): Registration | undefined {
    return this.getRegistrations().find(r => r.qrToken === token.trim());
  }

  public lookupRegistration(query: string, eventId?: string): Registration[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    return this.getRegistrations().filter(r => {
      const matchEvent = eventId ? r.eventId === eventId : true;
      const matchId = r.id.toLowerCase() === q;
      const matchEmail = r.email.toLowerCase() === q;
      const matchName = `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
      const matchToken = r.qrToken.toLowerCase() === q;
      return matchEvent && (matchId || matchEmail || matchName || matchToken);
    });
  }

  public checkDuplicateRegistration(eventId: string, email: string): boolean {
    const regs = this.getRegistrationsForEvent(eventId);
    return regs.some(r => r.email.toLowerCase() === email.trim().toLowerCase());
  }

  /**
   * Creates a new Online RSVP or Pre-registration
   */
  public registerGuest(data: {
    eventId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    dietaryPreferences?: string;
    rsvpStatus: RSVPStatus;
    customAnswers?: any[];
  }): Registration {
    const regs = this.getRegistrations();
    const eventRegs = regs.filter(r => r.eventId === data.eventId);
    const seq = (eventRegs.length + 1).toString().padStart(6, '0');
    const year = new Date().getFullYear();
    const regId = `EVT-${year}-${seq}`;
    const token = this.qrCodeService.generateSecureToken(data.eventId, regId);

    const newReg: Registration = {
      id: regId,
      eventId: data.eventId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim(),
      company: data.company?.trim(),
      jobTitle: data.jobTitle?.trim(),
      dietaryPreferences: data.dietaryPreferences?.trim(),
      rsvpStatus: data.rsvpStatus || 'attending',
      registrationType: 'pre-registered',
      registrationSource: 'form',
      registrationDate: new Date().toISOString(),
      qrToken: token,
      checkInStatus: false,
      customAnswers: data.customAnswers || []
    };

    regs.unshift(newReg);
    this.storageService.saveRegistrations(regs);
    this.registrationsSubject.next(regs);
    return newReg;
  }

  /**
   * Fast Walk-In Registration: creates registration and automatically checks them in
   */
  public registerWalkIn(data: {
    eventId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    dietaryPreferences?: string;
    checkedInBy?: string;
    customAnswers?: any[];
  }): Registration {
    const regs = this.getRegistrations();
    const walkInCount = regs.filter(r => r.eventId === data.eventId && r.registrationType === 'walk-in').length + 1;
    const seq = walkInCount.toString().padStart(5, '0');
    const year = new Date().getFullYear();
    const regId = `EVT-${year}-W-${seq}`;
    const token = this.qrCodeService.generateSecureToken(data.eventId, regId);
    const nowIso = new Date().toISOString();

    const newReg: Registration = {
      id: regId,
      eventId: data.eventId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim(),
      company: data.company?.trim(),
      jobTitle: data.jobTitle?.trim(),
      dietaryPreferences: data.dietaryPreferences?.trim(),
      rsvpStatus: 'attending',
      registrationType: 'walk-in',
      registrationSource: 'walk-in',
      registrationDate: nowIso,
      qrToken: token,
      checkInStatus: true,
      checkInTime: nowIso,
      checkedInBy: data.checkedInBy || 'Organizer (Front Desk)',
      customAnswers: data.customAnswers || [],
      notes: 'Walk-in fast registration on event day.'
    };

    regs.unshift(newReg);
    this.storageService.saveRegistrations(regs);
    this.registrationsSubject.next(regs);
    return newReg;
  }

  /**
   * Batch imported attendees from Excel
   */
  public importBatchAttendees(eventId: string, attendees: Array<Omit<Registration, 'id' | 'eventId' | 'qrToken' | 'registrationDate' | 'registrationType' | 'registrationSource' | 'checkInStatus'>>): Registration[] {
    const regs = this.getRegistrations();
    const created: Registration[] = [];
    let currentTotal = regs.filter(r => r.eventId === eventId).length;
    const year = new Date().getFullYear();

    for (const item of attendees) {
      currentTotal++;
      const seq = currentTotal.toString().padStart(6, '0');
      const regId = `EVT-${year}-${seq}`;
      const token = this.qrCodeService.generateSecureToken(eventId, regId);

      const newReg: Registration = {
        ...item,
        id: regId,
        eventId: eventId,
        registrationType: 'imported',
        registrationSource: 'excel-import',
        registrationDate: new Date().toISOString(),
        qrToken: token,
        checkInStatus: false,
        rsvpStatus: item.rsvpStatus || 'pending'
      };

      created.push(newReg);
      regs.push(newReg);
    }

    this.storageService.saveRegistrations(regs);
    this.registrationsSubject.next(regs);
    return created;
  }

  public updateRegistration(id: string, updates: Partial<Registration>): Registration | null {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.id === id);
    if (idx === -1) return null;

    regs[idx] = { ...regs[idx], ...updates };
    this.storageService.saveRegistrations(regs);
    this.registrationsSubject.next(regs);
    return regs[idx];
  }

  public deleteRegistration(id: string): boolean {
    let regs = this.getRegistrations();
    regs = regs.filter(r => r.id !== id);
    this.storageService.saveRegistrations(regs);
    this.registrationsSubject.next(regs);
    return true;
  }
}
