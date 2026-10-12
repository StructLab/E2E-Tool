import { Component } from '@angular/core';
import { EventService } from '../../event.service';

@Component({
  selector: 'app-quick-action',
  standalone: true,
  imports: [],
  templateUrl: './quick-action.html',
  styleUrl: './quick-action.css',
})
export class QuickAction {

  constructor(private eventService: EventService) {}

  deleteSelected(): void {
    this.eventService.triggerDeleteSelected();
  }

  duplicateSelected(): void {
    this.eventService.triggerDuplicateSelected();
  }

  centerView(): void {
    this.eventService.triggerCenterView();
  }

  mirrorHorizontal(): void {
  this.eventService.triggerMirrorSelected('horizontal');
  }

  mirrorVertical(): void {
    this.eventService.triggerMirrorSelected('vertical');
  }

   trim(): void {
    this.eventService.triggerMirrorSelected('vertical');
  }
}