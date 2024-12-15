// Import required AWS SDK clients and commands for Node.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyHandler } from "aws-lambda";

const s3Client = new S3Client({ region: "eu-west-2" });

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Parse the incoming request
        const body = event.body ? JSON.parse(event.body) : null;
        const fileName = event.queryStringParameters && event.queryStringParameters.filename;
                
        if (!fileName || !body || !body.imageBase64) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid input. Must provide imageBase64 and fileName in the URL path." }),
            };
        }

        const { imageBase64, nationality } = body;

        // Decode the base64 string to a binary buffer
        const imageBuffer = Buffer.from(imageBase64, "base64");

        // Prepare S3 upload parameters
        const putObjectParams = {
            Bucket: 'uploaded-passport-images',
            Key: fileName,
            Body: imageBuffer,
            ContentType: "image/jpeg", // Adjust ContentType based on your image type
            Metadata: {
                'passportNationality': nationality
            }
        };

        // Upload the image to S3
        await s3Client.send(new PutObjectCommand(putObjectParams));

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Adjust for your frontend domain
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Credentials": true,
            },
            body: JSON.stringify({ message: "Image uploaded successfully!" }),
        };
    } catch (error) {
        console.error("Error uploading image to S3:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to upload image.", error: error.message }),
        };
    }
};