import { Component, input, output } from '@angular/core';
import { Property } from '../property.model';

// Draws a string row: a text box (editable) or a plain box (not editable).
@Component({
  selector: 'app-string-property',
  standalone: true,
  templateUrl: './string-property.html',
  styleUrl: './property-template.css',
})
export class StringProperty {
  property = input.required<Property>();
  valueChanged = output<string>();

  onTyped(event: Event): void {
    const box = event.target as HTMLInputElement;
    this.valueChanged.emit(box.value);
  }

  text(): string {
    const value = this.property().propertyValue;
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }
}
