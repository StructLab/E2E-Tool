import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../event.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.html',
  styleUrl: './status-bar.css',
})
export class StatusBar {
  mode = 'Select';
  x = 0;
  y = 0;
  z = 1;
  grid = 10;

  constructor(private eventService: EventService) {
    this.eventService.canvasStatus$.subscribe((status) => {
      this.mode = status.mode;
      this.x = status.x;
      this.y = status.y;
      this.z = status.z;
      this.grid = status.grid;
    });
  }
}