// ONE row of the properties window, as the back end sends it.
// The front end never looks at the name or the value to decide how to draw the row.
// It only looks at propertyType.

export type PropertyType = 'string' | 'enum' | 'list' | 'boolean';

export interface Property {
  propertyName: string;
  propertyType: PropertyType;
  propertyValue: string | boolean | null;   // string, enum and boolean rows
  propertyValues: string[];                  // list rows
  enumValues: string[];                      // enum rows: the allowed choices
  editable: boolean;
}

// Reads one raw entry from the back end and returns a clean Property.
// The spelling of the field names is handled ONLY here (small or capital first letter),
// so if Khaled changes a name, this is the single place to change.
export function normalizeProperty(raw: any): Property {
  const name = raw.propertyName ?? raw.PropertyName ?? '';
  const rawType = String(raw.propertyType ?? raw.PropertyType ?? 'string').toLowerCase();
  const rawEditable = raw.editable ?? raw.Editable ?? false;
  const rawValue = raw.propertyValue ?? raw.PropertyValue ?? null;
  const rawValues = raw.propertyValues ?? raw.PropertyValues ?? [];
  const rawEnumValues = raw.enumValues ?? raw.EnumValues ?? [];

  // Unknown type: draw it as plain text, so the window never breaks.
  let type: PropertyType = 'string';
  if (rawType === 'enum' || rawType === 'list' || rawType === 'boolean' || rawType === 'string') {
    type = rawType;
  }

  // A list row sometimes arrives with one value instead of many.
  let values: string[] = [];
  if (Array.isArray(rawValues)) {
    values = rawValues.map((item: any) => String(item));
  } else if (rawValues !== null && rawValues !== undefined) {
    values = [String(rawValues)];
  }

  // A boolean can arrive as true/false or as the words "true"/"false".
  let value: string | boolean | null = rawValue;
  if (type === 'boolean') {
    value = rawValue === true || String(rawValue).toLowerCase() === 'true';
  }

  return {
    propertyName: String(name),
    propertyType: type,
    propertyValue: value,
    propertyValues: values,
    enumValues: Array.isArray(rawEnumValues) ? rawEnumValues.map((item: any) => String(item)) : [],
    editable: rawEditable === true || String(rawEditable).toLowerCase() === 'true',
  };
}
