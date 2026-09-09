import { Injectable } from '@angular/core';
import { Registration } from '../models/event.model';

export interface EventAnalytics {
  totalRegistrations: number;
  preRegisteredCount: number;
  excelImportCount: number;
  walkInCount: number;

  attendingCount: number;
  maybeCount: number;
  declinedCount: number;

  checkedInCount: number;
  notCheckedInCount: number;
  attendanceRate: number; // percentage (0 - 100)
  
  checkInRateBySource: {
    formRate: number;
    excelRate: number;
    walkInRate: number;
  };

  recentCheckIns: Registration[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  public calculateAnalytics(registrations: Registration[], eventCapacity: number = 0): EventAnalytics {
    const total = registrations.length;
    
    // By Source / Type
    const preReg = registrations.filter(r => r.registrationSource === 'form');
    const imported = registrations.filter(r => r.registrationSource === 'excel-import');
    const walkIns = registrations.filter(r => r.registrationSource === 'walk-in');

    // By RSVP
    const attending = registrations.filter(r => r.rsvpStatus === 'attending');
    const maybe = registrations.filter(r => r.rsvpStatus === 'maybe');
    const declined = registrations.filter(r => r.rsvpStatus === 'declined');

    // By Check-in
    const checkedIn = registrations.filter(r => r.checkInStatus);
    const notCheckedIn = registrations.filter(r => !r.checkInStatus);

    const checkedInCount = checkedIn.length;
    const attendanceRate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

    // Rates by source
    const formCheckedIn = preReg.filter(r => r.checkInStatus).length;
    const excelCheckedIn = imported.filter(r => r.checkInStatus).length;
    const walkInCheckedIn = walkIns.filter(r => r.checkInStatus).length;

    const formRate = preReg.length > 0 ? Math.round((formCheckedIn / preReg.length) * 100) : 0;
    const excelRate = imported.length > 0 ? Math.round((excelCheckedIn / imported.length) * 100) : 0;
    const walkInRate = walkIns.length > 0 ? Math.round((walkInCheckedIn / walkIns.length) * 100) : 0;

    // Recent check-ins sorted desc
    const recentCheckIns = [...checkedIn]
      .filter(r => r.checkInTime)
      .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())
      .slice(0, 8);

    return {
      totalRegistrations: total,
      preRegisteredCount: preReg.length,
      excelImportCount: imported.length,
      walkInCount: walkIns.length,

      attendingCount: attending.length,
      maybeCount: maybe.length,
      declinedCount: declined.length,

      checkedInCount: checkedInCount,
      notCheckedInCount: notCheckedIn.length,
      attendanceRate: attendanceRate,

      checkInRateBySource: {
        formRate,
        excelRate,
        walkInRate
      },

      recentCheckIns
    };
  }
}
