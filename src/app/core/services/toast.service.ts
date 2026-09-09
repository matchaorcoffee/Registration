import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  public show(type: 'success' | 'warning' | 'error' | 'info', title: string, message: string, timeout = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, title, message, timeout };
    
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    if (timeout > 0) {
      setTimeout(() => this.remove(id), timeout);
    }
  }

  public success(title: string, message: string = ''): void {
    this.show('success', title, message);
  }

  public error(title: string, message: string = ''): void {
    this.show('error', title, message);
  }

  public warning(title: string, message: string = ''): void {
    this.show('warning', title, message);
  }

  public info(title: string, message: string = ''): void {
    this.show('info', title, message);
  }

  public remove(id: string): void {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }
}
