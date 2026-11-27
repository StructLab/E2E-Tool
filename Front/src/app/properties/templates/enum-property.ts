import { Component, input, output } from '@angular/core';
import { Property } from '../property.model';

// Draws an enum row: a drop-down with the choices from enumValues.
// If not editable, the drop-down is disabled.
@Component({
  selector: 'app-enum-property',
  standalone: true,
  templateUrl: './enum-property.html',
  styleUrl: './property-template.css',
})
export class EnumProperty {
  property = input.required<Property>();
  valueChanged = output<string>();

  onPicked(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.valueChanged.emit(select.value);
  }

  current(): string {
    const value = this.property().propertyValue;
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }
}
