import { TextractClient, AnalyzeDocumentCommand, AnalyzeDocumentRequest } from "@aws-sdk/client-textract";
import { convertBlocksToKV, findMatchingValue } from '../../../utils/helpers'
import { client } from '../../../config/db'

const textractClient = new TextractClient({});
export const handler = async (event, context) => {
    try {

        console.log("Received S3 event");
        const record = event.Records[0];
        const bucketName = record.s3.bucket.name;
        const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        console.log(`Bucket: ${bucketName}, Key: ${objectKey}`);

        const textractParams: AnalyzeDocumentRequest = {
            Document: {
                S3Object: {
                    Bucket: bucketName,
                    Name: objectKey,
                },
            },
            FeatureTypes: ["FORMS"],
        };

        const textractCommand = new AnalyzeDocumentCommand(textractParams);
        const textractResponse = await textractClient.send(textractCommand);

        if (textractResponse.$metadata.httpStatusCode === 200) console.log('Response from Textract, status code === 200');
        else console.log('Response from Textract, status code !== 200');
        
        
        const extractedKeyValuePairs = convertBlocksToKV(textractResponse.Blocks)

        // passportNationality would ideally be passed by user -
        await persistData(extractedKeyValuePairs, "British")

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Textract analysis completed and stored for object key:", objectKey }),
        };
    } catch (error) {
        console.error("Error processing S3 event:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error processing S3 event", error: error.message }),
        };
    } finally {
        await client.end()
    }
};

interface FieldMapping {
    first_name: string;
    last_name: string;
    dob: string;
    nationality: string;
    pob: string;
  }

interface NationalityFieldMapping {
    [key: string]: FieldMapping;
  }

const persistData = async (extractedKeyValuePairs: {}, passportNationality: string) => {
    const DB_TABLE_NAME = process.env.DB_TABLE_NAME ?? "passport_data";
   
    // Define the mapping of source field names for different nationalities
    const nationalityFieldMapping: NationalityFieldMapping = {
      British: {
        first_name: "Given names",
        last_name: "Surname",
        dob: "Date of birth",
        nationality: "Nationality",
        pob: "Place of birth"
      },
      American: {
        first_name: "First Name",
        last_name: "Last Name",
        dob: "Date of Birth",
        nationality: "Nationality",
        pob: "Place of Birth"
      },
      French: {
        first_name: "Prénom",
        last_name: "Nom",
        dob: "Date de naissance",
        nationality: "Nationalité",
        pob: "Lieu de naissance"
      },
    };
  
    // Check if the nationality exists in the mapping
    const fieldMapping: FieldMapping = nationalityFieldMapping[passportNationality];
    if (!fieldMapping) {
        console.error(`Unsupported nationality: ${passportNationality}`)
      throw new Error(`Unsupported nationality: ${passportNationality}`);
    }
  
    // Extract the values for the required fields using the mapping for this nationality
        const first_name: string = findMatchingValue(extractedKeyValuePairs, fieldMapping.first_name)
        const last_name: string = findMatchingValue(extractedKeyValuePairs, fieldMapping.last_name)
        const dob: string = findMatchingValue(extractedKeyValuePairs, fieldMapping.dob)
        const nationality: string = findMatchingValue(extractedKeyValuePairs, fieldMapping.nationality)
        const pob: string = findMatchingValue(extractedKeyValuePairs, fieldMapping.pob)
  
  
    // Insert data into the database
    await client`
      insert into ${DB_TABLE_NAME}
        (first_name, last_name, dob, nationality, pob)
      values
        (${first_name}, ${last_name}, ${dob}, ${nationality}, ${pob})
      returning first_name, last_name, dob, nationality, pob
    `;
  };
  