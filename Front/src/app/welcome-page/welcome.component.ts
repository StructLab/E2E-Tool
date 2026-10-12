import { Component, EventEmitter, Output } from '@angular/core';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {
  
 constructor(private notificationService: NotificationService) { }
  fadeWelcome = false;

  @Output() start = new EventEmitter<void>();

  startApp() {
    this.fadeWelcome = true;

    setTimeout(() => {
      this.start.emit(); // 🔥 notify parent
    }, 400);
  }
}