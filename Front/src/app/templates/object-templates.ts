// =====================================================================
// Object templates
//
// A template describes ONE kind of railway object:
//   - its name and a short description ("what the object is"),
//   - its list of properties (attrs), each with a name, a description and a type.
//
// The right panel reads these templates and builds the edit form from them.
// To support a new object, add one more entry to OBJECT_TEMPLATES
// (and, if it uses a list of allowed values, one more entry to ENUM_TEMPLATES).
//
// The format is the same as in the domain JSON files (structs / enums).
// =====================================================================

// One property of an object.
export interface TemplateAttribute {
  intId: number;
  name: string;
  info?: string;
  label?: string;
  key?: string;            // "global" = this property is the identity of the object
  multiplicity?: string;   // for example "0..1" = optional
  sameKeyAs?: string;

  // Exactly one of the following says what kind of value the property holds:
  dataType?: string;       // for example "string", "boolean", "uint32", "double"
  enumType?: string;       // name of a list of allowed values, for example "ss026.ETCSMVersions"
  composition?: string;    // the property holds another object (shown read-only for now)
  reference?: string;      // the property points to another object (shown read-only for now)
}

// One kind of object.
export interface ObjectTemplate {
  name: string;
  info: string;
  belongsToSubPackage?: string;
  attrs: TemplateAttribute[];
}

// One allowed value of a list.
export interface EnumLiteral {
  intId: number;
  name: string;
  'owl:sameAs'?: string;
}

// One list of allowed values.
export interface EnumTemplate {
  name: string;
  enumLiterals: EnumLiteral[];
}

export const OBJECT_TEMPLATES: ObjectTemplate[] = [
  {
    name: 'BaliseGroup',
    info: 'Defines a group of balises on the railway trackbed.',
    attrs: [
      { intId: 1, name: 'id', dataType: 'string', key: 'global', sameKeyAs: 'infra.BaliseGroup', info: 'Identity of the object; used for referencing' },
      { intId: 2, name: 'etcsMVersion', enumType: 'ss026.ETCSMVersions', info: 'This gives the version of the ETCS system. Each part indicates the first and second number of the version respectively: The first number distinguishes not compatible versions (The three MSBs)_ The second number indicates compatibility within a version X. (The four LSBs)' },
      { intId: 3, name: 'q_link', dataType: 'boolean', info: 'true when the balise group is linked, otherwise, false (unlinked)' }
    ]
  },
  {
    name: 'ETCSMarker',
    info: 'Defines the ETCS Marker Boards ',
    belongsToSubPackage: 'FunctionalArea',
    attrs: [
      { intId: 1, name: 'id', dataType: 'string', key: 'global', info: 'Identity of the object; used for referencing' },
      { intId: 2, name: 'netPointReference', composition: 'NetPointReference', info: 'Defines position on LinearElement' },
      { intId: 3, name: 'markerFunctionStop', dataType: 'boolean', info: 'Defines the function associated with the ETCS marker board. true=stop, false=location (when the ETCS marker is a location marker)' },
      { intId: 4, name: 'name', dataType: 'string', info: 'User-friendly name, only if different from id', multiplicity: '0..1' }
    ]
  },
  {
    // PLACEHOLDER: there is no AxleCounter class in the domain JSON files yet.
    // Replace this entry with the real definition when it is available.
    name: 'AxleCounter',
    info: 'A train detector that counts the axles of the trains passing it.',
    attrs: [
      { intId: 1, name: 'id', dataType: 'string', key: 'global', info: 'Identity of the object; used for referencing' },
      { intId: 2, name: 'name', dataType: 'string', info: 'User-friendly name, only if different from id', multiplicity: '0..1' }
    ]
  }
];

export const ENUM_TEMPLATES: EnumTemplate[] = [
  {
    name: 'ETCSMVersions',
    enumLiterals: [
      { intId: 0, name: 'v1_0', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/10' },
      { intId: 1, name: 'v1_1', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/11' },
      { intId: 2, name: 'v2_0', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/20' },
      { intId: 3, name: 'v2_1', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/21' },
      { intId: 4, name: 'v2_2', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/22' },
      { intId: 5, name: 'v2_3', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/23' },
      { intId: 6, name: 'v3_0', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/30' },
      { intId: 7, name: 'v_previous', 'owl:sameAs': 'http://data.europa.eu/949/concepts/etcs-m-versions/00' }
    ]
  }
];
