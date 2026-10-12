import { Component, ChangeDetectorRef } from '@angular/core';
import { EventService } from '../event.service';

@Component({
  selector: 'app-footer-bar',
  standalone: true,
  imports: [],
  templateUrl: './footer-bar.html',
  styleUrl: './footer-bar.css'
})
export class FooterBar {
  mode = 'Select';

  cursorX = 0;
  cursorY = 0;
  cursorZ = 1;

  gridSize = 10;

  lastSave = '--:--';
  isConnected = false;

  constructor(
    private eventService: EventService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventService.canvasStatus$.subscribe((status) => {
    

      this.mode = status.mode;
      this.cursorX = status.x;
      this.cursorY = status.y;
      this.cursorZ = status.z;
      this.gridSize = status.grid;

      // Force footer HTML to update because canvas events run outside Angular change detection
      this.cdr.detectChanges();
    });
  }
}