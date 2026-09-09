import { Injectable } from '@angular/core';
import { RegistrationService } from './registration.service';
import { Registration } from '../models/event.model';

export type CheckInResultStatus = 'success' | 'already-checked-in' | 'invalid-event' | 'not-found' | 'error';

export interface CheckInVerificationResult {
  status: CheckInResultStatus;
  message: string;
  registration?: Registration;
  checkedInAt?: string;
  previousCheckInTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckInService {

  constructor(private registrationService: RegistrationService) {}

  /**
   * Validates a scanned QR token or manual code against the current event
   */
  public verifyAndCheckIn(tokenOrId: string, currentEventId: string, checkedInBy: string = 'Organizer (Check-In Staff)'): CheckInVerificationResult {
    const raw = tokenOrId.trim();
    if (!raw) {
      return {
        status: 'not-found',
        message: 'No token or registration code provided.'
      };
    }

    // Attempt to match by token first, then by registration ID, then by email
    let reg = this.registrationService.getRegistrationByToken(raw);
    if (!reg) {
      reg = this.registrationService.getRegistrationById(raw);
    }
    if (!reg) {
      const byLookup = this.registrationService.lookupRegistration(raw, currentEventId);
      if (byLookup.length > 0) {
        reg = byLookup[0];
      }
    }

    if (!reg) {
      return {
        status: 'not-found',
        message: 'This QR code or registration ID is not recognized.'
      };
    }

    // Verify it belongs to the current event
    if (reg.eventId !== currentEventId) {
      return {
        status: 'invalid-event',
        message: 'This registration belongs to a different event, not this one.'
      };
    }

    // Check if declined
    if (reg.rsvpStatus === 'declined') {
      return {
        status: 'invalid-event',
        message: 'This guest RSVP response was marked as Declined.',
        registration: reg
      };
    }

    // Check if already checked in
    if (reg.checkInStatus) {
      return {
        status: 'already-checked-in',
        message: 'Guest has already been checked in!',
        registration: reg,
        previousCheckInTime: reg.checkInTime
      };
    }

    // Record successful check-in
    const nowIso = new Date().toISOString();
    const updated = this.registrationService.updateRegistration(reg.id, {
      checkInStatus: true,
      checkInTime: nowIso,
      checkedInBy: checkedInBy
    });

    return {
      status: 'success',
      message: 'Check-in successful! Welcome to the event.',
      registration: updated || reg,
      checkedInAt: nowIso
    };
  }

  /**
   * Reverts check-in status (e.g. accidental scan)
   */
  public undoCheckIn(registrationId: string): boolean {
    const reg = this.registrationService.getRegistrationById(registrationId);
    if (!reg) return false;

    return !!this.registrationService.updateRegistration(registrationId, {
      checkInStatus: false,
      checkInTime: undefined,
      checkedInBy: undefined
    });
  }
}
