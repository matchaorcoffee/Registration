import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Event, EventStatus, CustomQuestion } from '../models/event.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventsSubject: BehaviorSubject<Event[]>;
  public events$: Observable<Event[]>;

  constructor(private storageService: StorageService) {
    const events = this.storageService.getEvents();
    this.eventsSubject = new BehaviorSubject<Event[]>(events);
    this.events$ = this.eventsSubject.asObservable();
  }

  public getEvents(organizerId?: string): Event[] {
    const events = this.storageService.getEvents();
    const mapped = events.map(e => ({ ...e, status: this.deriveEventStatus(e) }));
    if (organizerId) {
      return mapped.filter(e => e.organizerId === organizerId);
    }
    return mapped;
  }

  public getEventById(id: string): Event | undefined {
    const events = this.getEvents();
    return events.find(e => e.id === id);
  }

  public createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'status'>, customQuestions?: CustomQuestion[]): Event {
    const events = this.storageService.getEvents();
    const newId = `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    
    const newEvent: Event = {
      ...eventData,
      id: newId,
      status: 'registration-open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    newEvent.status = this.deriveEventStatus(newEvent);
    events.unshift(newEvent);
    this.storageService.saveEvents(events);
    this.eventsSubject.next(events);

    if (customQuestions && customQuestions.length) {
      const allQuestions = this.storageService.getCustomQuestions();
      const mappedQuestions = customQuestions.map((q, idx) => ({
        ...q,
        id: `cq-${newId}-${idx + 1}`,
        eventId: newId,
        order: idx + 1
      }));
      this.storageService.saveCustomQuestions([...allQuestions, ...mappedQuestions]);
    }

    return newEvent;
  }

  public updateEvent(id: string, updates: Partial<Event>): Event | null {
    const events = this.storageService.getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) return null;

    events[index] = {
      ...events[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    events[index].status = this.deriveEventStatus(events[index]);

    this.storageService.saveEvents(events);
    this.eventsSubject.next(events);
    return events[index];
  }

  public deleteEvent(id: string): boolean {
    let events = this.storageService.getEvents();
    events = events.filter(e => e.id !== id);
    this.storageService.saveEvents(events);
    this.eventsSubject.next(events);

    // Also remove registrations associated with this event
    const regs = this.storageService.getRegistrations().filter(r => r.eventId !== id);
    this.storageService.saveRegistrations(regs);

    // Also remove questions
    const questions = this.storageService.getCustomQuestions().filter(q => q.eventId !== id);
    this.storageService.saveCustomQuestions(questions);

    return true;
  }

  /**
   * Duplicates an event without copying attendees, registrations, or QR tokens.
   */
  public duplicateEvent(sourceEventId: string, newName?: string, newOrganizerId?: string): Event | null {
    const sourceEvent = this.getEventById(sourceEventId);
    if (!sourceEvent) return null;

    const newId = `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const clonedEvent: Event = {
      ...sourceEvent,
      id: newId,
      name: newName || `${sourceEvent.name} (Copy)`,
      organizerId: newOrganizerId || sourceEvent.organizerId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const events = this.storageService.getEvents();
    events.unshift(clonedEvent);
    this.storageService.saveEvents(events);
    this.eventsSubject.next(events);

    // Clone custom questions for the new event
    const sourceQuestions = this.getCustomQuestionsForEvent(sourceEventId);
    if (sourceQuestions.length) {
      const allQuestions = this.storageService.getCustomQuestions();
      const clonedQuestions: CustomQuestion[] = sourceQuestions.map((q, idx) => ({
        ...q,
        id: `cq-${newId}-${idx + 1}`,
        eventId: newId
      }));
      this.storageService.saveCustomQuestions([...allQuestions, ...clonedQuestions]);
    }

    return clonedEvent;
  }

  // --- Custom Questions Management ---
  public getCustomQuestionsForEvent(eventId: string): CustomQuestion[] {
    const questions = this.storageService.getCustomQuestions();
    return questions
      .filter(q => q.eventId === eventId)
      .sort((a, b) => a.order - b.order);
  }

  public saveCustomQuestionsForEvent(eventId: string, questions: CustomQuestion[]): void {
    const all = this.storageService.getCustomQuestions().filter(q => q.eventId !== eventId);
    const mapped = questions.map((q, idx) => ({
      ...q,
      id: q.id || `cq-${eventId}-${idx + 1}`,
      eventId: eventId,
      order: idx + 1
    }));
    this.storageService.saveCustomQuestions([...all, ...mapped]);
  }

  /**
   * Derive status dynamically based on current date/time and registration deadline
   */
  public deriveEventStatus(event: Event): EventStatus {
    if (event.status === 'archived' || event.status === 'draft') {
      return event.status;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const eventDateStr = event.date;
    const deadlineStr = event.registrationDeadline;

    if (eventDateStr < todayStr) {
      return 'completed';
    }
    if (eventDateStr === todayStr) {
      return 'ongoing';
    }
    if (deadlineStr && deadlineStr < todayStr) {
      return 'registration-closed';
    }
    return 'registration-open';
  }
}
