import { Component } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

interface ReportStatusItem {
  time: string;
  operation: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

@Component({
  selector: 'app-report-status-block',
  standalone: true,
  imports: [],
  templateUrl: './report-status-block.html',
  styleUrl: './report-status-block.css',
})
export class ReportStatusBlock {

  reports: ReportStatusItem[] = [];

  constructor(private notificationService: NotificationService) {
    this.notificationService.notifications$.subscribe((notification: any) => {
      if (!notification?.text || notification.text.trim() === '') {
        return;
      }

      this.reports.unshift({
        time: this.getCurrentTime(),
        operation: notification.operation ?? 'System',
        message: notification.text,
        type: notification.type ?? 'info'
      });
    });
  }

  private getCurrentTime(): string {
    const now = new Date();

    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  clearReports(): void {
    this.reports = [];
  }
}