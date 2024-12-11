import { handler } from '../handler/invokeTextraction';
import AWS from 'aws-sdk-mock';

// Mock the postgres client
jest.mock('../../../config/db', () => ({
  client: jest.fn().mockImplementation(() => ({
    // Mock the tagged sql template to return a resolved value
    sql: jest.fn().mockResolvedValue([
      { first_name: 'John', last_name: 'Doe', dob: '1990-01-01', nationality: 'British', pob: 'London' }
    ]),
    end: jest.fn(),  // Mock the end method (for closing DB connection)
  })),
}));

describe('Lambda handler', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear previous mocks
    AWS.restore(); // Restore any AWS mocks if needed
  });

  it('should process the S3 event and return success', async () => {
    // Arrange: Mock the external calls
    
    const mockTextractResponse = {
      $metadata: { httpStatusCode: 200 },
      Blocks: [
        {
          Id: "1",
          BlockType: "KEY_VALUE_SET",
          EntityTypes: ["KEY"],
          Text: "Given names"
        },
        {
          Id: "2",
          BlockType: "KEY_VALUE_SET",
          EntityTypes: ["VALUE"],
          Text: "John"
        }
        // Add other mock blocks if needed
      ]
    };

    // Mock Textract client call
    AWS.mock('Textract', 'analyzeDocument', mockTextractResponse);

    // Mock event (S3 trigger event)
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'test-file.pdf' },
          }
        }
      ]
    };

    const context = {};

    // Act: Call the Lambda handler
    const response = await handler(event, context);

    // Assert: Check the response
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Textract analysis completed and stored for object key:');
    // expect(AWS.Textract.analyzeDocument).toHaveBeenCalledTimes(1);
    // expect(client().end).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and return an error response', async () => {
    // Arrange: Simulate an error in Textract
    const mockTextractError = new Error('Textract service error');
    AWS.mock('Textract', 'analyzeDocument', () => { throw mockTextractError; });

    // Mock event (S3 trigger event)
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'test-file.pdf' },
          }
        }
      ]
    };

    const context = {};

    // Act: Call the Lambda handler
    const response = await handler(event, context);

    // Assert: Check the error handling response
    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Error processing S3 event');
    // expect(client().end).toHaveBeenCalledTimes(1);
  });
});
