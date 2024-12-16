const {
  TextractClient,
  AnalyzeDocumentCommand,
} = require('@aws-sdk/client-textract');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');

const { handler } = require('../handler/invokeTextraction');
const {
  convertBlocksToKV,
  findMatchingValue,
} = require('../../../utils/helpers');

jest.mock('@aws-sdk/client-textract');
jest.mock('@aws-sdk/client-s3');
jest.mock('pg');
jest.mock('../../../utils/helpers');

describe('Textract Handler', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    };
    Client.mockImplementation(() => mockClient);
  });

  test('should process the S3 event and store data in the database', async () => {
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'test-object-key' },
          },
        },
      ],
    };

    const mockTextractResponse = {
      Blocks: [{ BlockType: 'KEY_VALUE_SET', Text: 'Sample Text' }],
      $metadata: { httpStatusCode: 200 },
    };

    const mockHeadResult = {
      Metadata: { passportnationality: 'UK' },
    };

    const extractedKeyValuePairs = {
      'Given names': 'John',
      Surname: 'Doe',
      'Date of birth': '1990-01-01',
      Nationality: 'British',
      'Place of birth': 'London',
    };

    S3Client.prototype.send = jest.fn().mockResolvedValue(mockHeadResult);
    TextractClient.prototype.send = jest
      .fn()
      .mockResolvedValue(mockTextractResponse);
    convertBlocksToKV.mockReturnValue(extractedKeyValuePairs);
    findMatchingValue.mockImplementation((kvPairs, key) => kvPairs[key]);

    process.env.DB_CONNECTION_STRING = 'postgres://user:password@localhost/db';
    process.env.DB_TABLE_NAME = 'passport_data';

    const result = await handler(mockEvent, {});

    expect(S3Client.prototype.send).toHaveBeenCalledWith(
      expect.any(HeadObjectCommand)
    );
    expect(TextractClient.prototype.send).toHaveBeenCalledWith(
      expect.any(AnalyzeDocumentCommand)
    );
    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO passport_data'),
      ['John', 'Doe', '1990-01-01', 'British', 'London']
    );
    expect(mockClient.end).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Textract analysis completed and stored for object key:',
        objectKey: 'test-object-key',
      }),
    });
  });

  test('should handle missing nationality metadata', async () => {
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'test-object-key' },
          },
        },
      ],
    };

    const mockHeadResult = {
      Metadata: {},
    };

    S3Client.prototype.send = jest.fn().mockResolvedValue(mockHeadResult);

    process.env.DB_CONNECTION_STRING = 'postgres://user:password@localhost/db';

    const result = await handler(mockEvent, {});

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing S3 event',
        error: 'Nationality not specified',
      }),
    });
  });

  test('should handle unsupported nationality', async () => {
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'test-object-key' },
          },
        },
      ],
    };

    const mockHeadResult = {
      Metadata: { passportnationality: 'UNKNOWN' },
    };

    S3Client.prototype.send = jest.fn().mockResolvedValue(mockHeadResult);

    process.env.DB_CONNECTION_STRING = 'postgres://user:password@localhost/db';

    const result = await handler(mockEvent, {});

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing S3 event',
        error: 'Unsupported nationality: UNKNOWN',
      }),
    });
  });
});
