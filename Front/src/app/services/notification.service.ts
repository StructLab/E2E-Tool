import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface NotificationMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
  id?:string;
  content?:any
  operation:string
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notificationSubject = new Subject<NotificationMessage>();
  notifications$ = this.notificationSubject.asObservable();

  notify(message: NotificationMessage) {
    this.notificationSubject.next(message);
  }
}