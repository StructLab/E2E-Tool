import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ButtonStateService {
  segmentProfileActive = false;
  timingPointActive = false;
}