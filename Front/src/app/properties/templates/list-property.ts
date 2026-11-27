import { Component, input } from '@angular/core';
import { Property } from '../property.model';

// Draws a list row: one small box per value. Lists are never editable.
@Component({
  selector: 'app-list-property',
  standalone: true,
  templateUrl: './list-property.html',
  styleUrl: './property-template.css',
})
export class ListProperty {
  property = input.required<Property>();
}
