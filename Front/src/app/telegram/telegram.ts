import { Component, OnInit, OnDestroy} from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { QueryRINF } from '../api/end_points';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-telegram',
  imports: [CommonModule, FormsModule], // 👈 THIS is required for *ngFor
  templateUrl: './telegram.html',
  styleUrls: ['./telegram.css'],
})
export class Telegram implements OnInit, OnDestroy {

  isVisible = false;
  xmlContent = '';
  telegramContent = '';
  trackId = '';
  baliseGroupId = '';
  private sub!: Subscription;
  searchText: string = ` PREFIX era: <http://data.europa.eu>
      SELECT ?p ?o
      WHERE {
          <http://data.europa.eu/949/track/> ?p ?o .
      }`;
  constructor(private notificationService: NotificationService) { }


  async ngOnInit() {
    this.sub =
  this.notificationService.notifications$
    .subscribe((notification) => {
      if (
        notification.operation ===
        'create telegram'
      ) {
        this.isVisible = true;

        console.log(
          notification.content
        );

        this.baliseGroupId =
          notification.content[0];

        this.query();
      }
    });
  }

  ngOnDestroy(): void {
  this.sub?.unsubscribe();
}

  open() {
    this.isVisible = true;
  }

  close() {
    this.isVisible = false;
  }
  async query() {
    const result = await QueryRINF(
  this.searchText ?? '',
  this.baliseGroupId ?? ''
);

    this.xmlContent = JSON.stringify(JSON.parse(result['json']), null, 2);
    this.telegramContent = JSON.stringify(result['telegram'], null, 2);

    if (this.baliseGroupId !== ``) {
      this.searchText = `
      PREFIX era: <http://data.europa.eu>
      SELECT ?p ?o
      WHERE {
          <http://data.europa.eu/949/track/${result['id']}> ?p ?o .
      }`;
      this.baliseGroupId = ``;
    }

     this.notificationService.notify({
            type: "success",
            text: ``,
            content: [],
            operation: "export"
        });


  }
}