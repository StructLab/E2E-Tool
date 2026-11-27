import { Injectable } from '@angular/core';
import { GetObjectProperties } from '../api/end_points';
import { Property, normalizeProperty } from './property.model';
import { fakePropertiesAnswer } from './property.mock';

// true  = use the stand-in answer (back end not ready yet)
// false = call the real back end
export const USE_FAKE_BACKEND = true;

@Injectable({ providedIn: 'root' })
export class PropertyService {

  // Values the user changed, kept in the front end only: objectId -> (propertyName -> value)
  private edits = new Map<string, Map<string, string | boolean>>();

  // Asks for the property list of one clicked object.
  async loadProperties(id: string, type: string): Promise<Property[]> {
    let rawList: any[];
    if (USE_FAKE_BACKEND) {
      rawList = fakePropertiesAnswer(id, type);
    } else {
      rawList = await GetObjectProperties(id, type);
    }

    const properties = rawList.map((raw) => normalizeProperty(raw));

    // Put back what the user typed earlier for this object.
    const saved = this.edits.get(id);
    if (saved) {
      for (const property of properties) {
        if (saved.has(property.propertyName)) {
          property.propertyValue = saved.get(property.propertyName)!;
        }
      }
    }
    return properties;
  }

  // Remembers one edited value (front end only).
  setValue(id: string, propertyName: string, value: string | boolean): void {
    if (!this.edits.has(id)) {
      this.edits.set(id, new Map());
    }
    this.edits.get(id)!.set(propertyName, value);
  }
}
