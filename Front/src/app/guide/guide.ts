import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-guide',
  imports: [CommonModule], // 👈 THIS is required for *ngFor
  templateUrl: './guide.html',
  styleUrls: ['./guide.css'],
})
export class Guide {
  @Input() steps: string[] =[];
}