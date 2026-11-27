import { Injectable } from '@angular/core';
import {
  ENUM_TEMPLATES,
  EnumLiteral,
  OBJECT_TEMPLATES,
  ObjectTemplate,
  TemplateAttribute
} from './object-templates';

// The kind of input field that the right panel shows for one property.
export type FieldKind = 'id' | 'text' | 'number' | 'boolean' | 'enum' | 'readonly';

// This service does two jobs:
//   1. It finds the template of an object type (what the object is, which properties it has).
//   2. It keeps the values that the user typed for each object (front end only, nothing is sent to the back end).
@Injectable({ providedIn: 'root' })
export class ObjectTemplateService {

  // All typed values: values[objectId][propertyName] = value
  private values: { [objectId: string]: { [propertyName: string]: any } } = {};

  // The canvas uses its own spelling for some types, the templates use the data model spelling.
  private canvasTypeToTemplateName(canvasType: string): string {
    if (canvasType === 'ETCSmarker') {
      return 'ETCSMarker';
    }
    return canvasType;
  }

  // Returns the template for a canvas type, or null if there is none.
  getTemplate(canvasType: string): ObjectTemplate | null {
    const templateName = this.canvasTypeToTemplateName(canvasType);
    for (const template of OBJECT_TEMPLATES) {
      if (template.name === templateName) {
        return template;
      }
    }
    return null;
  }

  // Returns the allowed values of a list. The name may carry a prefix like "ss026.".
  getEnumLiterals(enumType: string): EnumLiteral[] {
    let plainName = enumType;
    const dotPosition = enumType.lastIndexOf('.');
    if (dotPosition >= 0) {
      plainName = enumType.substring(dotPosition + 1);
    }
    for (const enumTemplate of ENUM_TEMPLATES) {
      if (enumTemplate.name === plainName) {
        return enumTemplate.enumLiterals;
      }
    }
    return [];
  }

  // Says which kind of input field a property needs.
  getFieldKind(attribute: TemplateAttribute): FieldKind {
    if (attribute.key === 'global') {
      return 'id';
    }
    if (attribute.enumType) {
      return 'enum';
    }
    if (attribute.composition || attribute.reference) {
      return 'readonly';
    }
    if (attribute.dataType === 'boolean') {
      return 'boolean';
    }
    if (attribute.dataType === 'string') {
      return 'text';
    }
    if (attribute.dataType) {
      return 'number';     // uint32, int32, double, ...
    }
    return 'readonly';
  }

  // Returns the stored value of one property. If there is none yet, a start value is used.
  getValue(objectId: string, attribute: TemplateAttribute): any {
    const objectValues = this.values[objectId];
    if (objectValues && attribute.name in objectValues) {
      return objectValues[attribute.name];
    }

    const kind = this.getFieldKind(attribute);
    if (kind === 'id') {
      return objectId;
    }
    if (kind === 'boolean') {
      return false;
    }
    if (kind === 'number') {
      return null;
    }
    return '';
  }

  // Stores the value that the user typed.
  setValue(objectId: string, attributeName: string, value: any): void {
    if (!this.values[objectId]) {
      this.values[objectId] = {};
    }
    this.values[objectId][attributeName] = value;
  }
}
