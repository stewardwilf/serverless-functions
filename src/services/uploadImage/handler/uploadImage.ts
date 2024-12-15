// Import required AWS SDK clients and commands for Node.js
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler } from 'aws-lambda';

const s3Client = new S3Client({ region: 'eu-west-2' });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;
    const fileName =
      event.queryStringParameters && event.queryStringParameters.filename;
    const bucketName = process.env.BUCKET_NAME;

    if (!fileName || !body || !body.imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            'Invalid input. Must provide imageBase64 and fileName in the URL path.',
        }),
      };
    }

    const { imageBase64, nationality } = body;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const putObjectParams: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        passportNationality: nationality,
      },
    };

    await s3Client.send(new PutObjectCommand(putObjectParams));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Image uploaded successfully!' }),
    };
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to upload image.',
        error: error.message,
      }),
    };
  }
};
