import {
  TextractClient,
  AnalyzeDocumentCommand,
  AnalyzeDocumentRequest,
} from '@aws-sdk/client-textract';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';

import { convertBlocksToKV, findMatchingValue } from '../../../utils/helpers';
import {
  FieldMapping,
  NationalityFieldMapping,
} from '../../../types/fieldMappings';

const textractClient = new TextractClient({});
const s3 = new S3Client({});

let client;

export const handler = async (event, context) => {
  const connectionString = process.env.DB_CONNECTION_STRING;

  if (!connectionString) {
    console.error(`Connectionstring not found`);
    throw new Error(`Connectionstring not found`);
  }

  client = new Client({
    connectionString,
  });

  await client.connect();

  try {
    console.log('Received S3 event, attempting to process');
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, ' ')
    );

    const headResult = await s3.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      })
    );

    console.log('Metadata for object', headResult?.Metadata);

    if (!headResult?.Metadata?.passportnationality) {
      console.error(`Nationality not specified`);
      throw new Error(`Nationality not specified`);
    }

    const textractParams: AnalyzeDocumentRequest = {
      Document: {
        S3Object: {
          Bucket: bucketName,
          Name: objectKey,
        },
      },
      FeatureTypes: ['FORMS'],
    };

    const textractCommand = new AnalyzeDocumentCommand(textractParams);
    const textractResponse = await textractClient.send(textractCommand);

    if (textractResponse.$metadata.httpStatusCode === 200)
      console.log('Response from Textract OK');
    else console.log('Response from Textract not 200 OK');

    const extractedKeyValuePairs = convertBlocksToKV(textractResponse.Blocks);

    await persistDataToDatabase(
      extractedKeyValuePairs,
      headResult?.Metadata?.passportnationality
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Textract analysis completed and stored for object key:',
        objectKey,
      }),
    };
  } catch (error) {
    console.error('Error processing S3 event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing S3 event',
        error: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};

const getFieldValuesByNationality = (
  extractedKeyValuePairs: {},
  passportNationality: string
): {
  first_name: string;
  last_name: string;
  dob: string;
  nationality: string;
  pob: string;
} => {
  const nationalityFieldMapping: NationalityFieldMapping = {
    UK: {
      first_name: 'Given names',
      last_name: 'Surname',
      dob: 'Date of birth',
      nationality: 'Nationality',
      pob: 'Place of birth',
    },
    US: {
      first_name: 'First Name',
      last_name: 'Last Name',
      dob: 'Date of Birth',
      nationality: 'Nationality',
      pob: 'Place of Birth',
    },
    FR: {
      first_name: 'Prénom',
      last_name: 'Nom',
      dob: 'Date de naissance',
      nationality: 'Nationalité',
      pob: 'Lieu de naissance',
    },
  };

  const fieldMapping: FieldMapping =
    nationalityFieldMapping[passportNationality];
  if (!fieldMapping) {
    console.error(`Unsupported nationality: ${passportNationality}`);
    throw new Error(`Unsupported nationality: ${passportNationality}`);
  }

  const first_name: string = findMatchingValue(
    extractedKeyValuePairs,
    fieldMapping.first_name
  );
  const last_name: string = findMatchingValue(
    extractedKeyValuePairs,
    fieldMapping.last_name
  );
  const dob: string = findMatchingValue(
    extractedKeyValuePairs,
    fieldMapping.dob
  );
  const nationality: string = findMatchingValue(
    extractedKeyValuePairs,
    fieldMapping.nationality
  );
  const pob: string = findMatchingValue(
    extractedKeyValuePairs,
    fieldMapping.pob
  );

  return { first_name, last_name, dob, nationality, pob };
};

const persistDataToDatabase = async (
  extractedKeyValuePairs: {},
  passportNationality: string
) => {
  console.log('Data extracted, attempting to store in db');
  const DB_TABLE_NAME = process?.env?.DB_TABLE_NAME;
  if (!DB_TABLE_NAME) {
    console.error(`DB_TABLE_NAME not defined or detected`);
    throw new Error(`DB_TABLE_NAME not defined or detected`);
  }
  try {
    const { first_name, last_name, dob, nationality, pob } =
      getFieldValuesByNationality(extractedKeyValuePairs, passportNationality);

    const text = `INSERT INTO ${DB_TABLE_NAME}(first_name, last_name, dob, nationality, pob) VALUES($1, $2, $3, $4, $5)`;
    const values = [first_name, last_name, dob, nationality, pob];

    await client.query(text, values);
  } catch (error) {
    console.error('Error persisting data:', error);
    throw error;
  }
};
