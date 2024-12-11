// src/types/fieldMappings.ts

export interface FieldMapping {
    first_name: string;
    last_name: string;
    dob: string;
    nationality: string;
    pob: string;
  }
  
  export interface NationalityFieldMapping {
    [key: string]: FieldMapping;
  }
  