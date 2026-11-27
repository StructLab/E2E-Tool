import { Component, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventService } from '../event.service';
import { Property } from '../properties/property.model';
import { PropertyService } from '../properties/property.service';
import { StringProperty } from '../properties/templates/string-property';
import { EnumProperty } from '../properties/templates/enum-property';
import { ListProperty } from '../properties/templates/list-property';
import { BooleanProperty } from '../properties/templates/boolean-property';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [StringProperty, EnumProperty, ListProperty, BooleanProperty],
  templateUrl: './right-sidebar.html',
  styleUrl: './right-sidebar.css',
})
export class RightSidebar implements OnDestroy {

  // Placeholder values for layout only
  projectName: string = 'Demo_Project';
  coordinateSystem: string = 'Local (m)';
  scale: string = '1:1000';
  gridSize: string = '10 m';

  // The selected object and its property rows (signals: the screen updates by itself).
  selectedId = signal<string | null>(null);
  selectedDisplayId = signal<string>('');
  selectedType = signal<string>('');
  properties = signal<Property[]>([]);
  loading = signal<boolean>(false);
  errorText = signal<string>('');

  // Counts the clicks. If an answer arrives for an older click, it is thrown away.
  private requestNumber = 0;
  private subscription: Subscription;

  constructor(
    private eventService: EventService,
    private propertyService: PropertyService
  ) {
    this.subscription = this.eventService.objectSelected$.subscribe((selected) => {
      this.handleObjectSelected(selected);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async handleObjectSelected(selected: { id: string; type: string; displayId?: string } | null): Promise<void> {
    this.requestNumber++;
    const myNumber = this.requestNumber;

    if (selected === null) {
      this.selectedId.set(null);
      this.selectedDisplayId.set('');
      this.selectedType.set('');
      this.properties.set([]);
      this.loading.set(false);
      this.errorText.set('');
      return;
    }

    this.selectedId.set(selected.id);
    this.selectedDisplayId.set(selected.displayId ?? '');
    this.selectedType.set(selected.type);
    this.properties.set([]);
    this.errorText.set('');
    this.loading.set(true);

    try {
      const list = await this.propertyService.loadProperties(selected.id, selected.type);
      if (myNumber !== this.requestNumber) {
        return;   // the user clicked something else meanwhile
      }
      this.properties.set(list);
    } catch (error) {
      if (myNumber !== this.requestNumber) {
        return;
      }
      this.errorText.set('Could not load the properties.');
    }
    this.loading.set(false);
  }

  // A row tells us its value changed: keep it in the front end.
  onValueChanged(property: Property, value: string | boolean): void {
    const id = this.selectedId();
    if (id === null) {
      return;
    }
    property.propertyValue = value;
    this.propertyService.setValue(id, property.propertyName, value);
  }
}
