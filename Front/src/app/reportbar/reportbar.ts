import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationMessage } from '../services/notification.service';

@Component({
  selector: 'app-reportbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportbar.html',
  styleUrls: ['./reportbar.css']
})
export class Reportbar implements OnInit {

  messages: NotificationMessage[] = [];
  private messageTimeout: any;
  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
  this.notificationService.notifications$
    .subscribe(message => {

      // Create new array reference (important!)
      this.messages = [...this.messages, message];

      // Cancel previous timer
      if (this.messageTimeout) {
        clearTimeout(this.messageTimeout);
      }

      // Start new timer (5s after latest message)
      this.messageTimeout = setTimeout(() => {
        this.messages = [];
        this.cdr.markForCheck(); // better than detectChanges()
      }, 1000);

      this.cdr.markForCheck();
    });
}
}