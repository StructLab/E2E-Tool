// STAND-IN for the back end. It returns the same kind of answer Khaled described.
// Remove it (or set USE_FAKE_BACKEND = false in property.service.ts) when the real call works.

export function fakePropertiesAnswer(id: string, type: string): any[] {
  return [
    { propertyName: 'Name', propertyType: 'string', propertyValue: id, editable: true },
    { propertyName: 'Type', propertyType: 'string', propertyValue: type, editable: false },
    {
      propertyName: 'TVPS',
      propertyType: 'enum',
      propertyValue: 'Tvps_A',
      enumValues: ['Tvps_A', 'Tvps_B', 'Tvps_C'],
      editable: false,
    },
    {
      propertyName: 'Detection mode',
      propertyType: 'enum',
      propertyValue: 'Mode_1',
      enumValues: ['Mode_1', 'Mode_2'],
      editable: true,
    },
    { propertyName: 'Track', propertyType: 'list', propertyValues: ['Track_01', 'Track_02'], editable: false },
    { propertyName: 'Active', propertyType: 'boolean', propertyValue: true, editable: true },
  ];
}
