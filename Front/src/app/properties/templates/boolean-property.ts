import { Component, input, output } from '@angular/core';
import { Property } from '../property.model';

// Draws a boolean row: a check box. If not editable, it is disabled.
@Component({
  selector: 'app-boolean-property',
  standalone: true,
  templateUrl: './boolean-property.html',
  styleUrl: './property-template.css',
})
export class BooleanProperty {
  property = input.required<Property>();
  valueChanged = output<boolean>();

  onToggled(event: Event): void {
    const box = event.target as HTMLInputElement;
    this.valueChanged.emit(box.checked);
  }

  isOn(): boolean {
    return this.property().propertyValue === true;
  }
}
