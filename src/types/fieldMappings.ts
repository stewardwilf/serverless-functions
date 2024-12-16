// src/types/fieldMappings.ts

export interface FieldMapping {
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  pob: string;
}

export interface NationalityFieldMapping {
  [key: string]: FieldMapping;
}
