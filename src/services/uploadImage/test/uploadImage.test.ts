const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const { handler } = require('../handler/uploadImage');

jest.mock('@aws-sdk/client-s3');

describe('S3 Upload Handler', () => {
  const mockS3Send = jest.fn();
  S3Client.prototype.send = mockS3Send;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
  });

  test('should upload image successfully', async () => {
    const mockEvent = {
      body: JSON.stringify({
        imageBase64: Buffer.from('test-image').toString('base64'),
        nationality: 'UK',
      }),
      queryStringParameters: { filename: 'test-image.jpg' },
    };

    mockS3Send.mockResolvedValueOnce({});

    const result = await handler(mockEvent);

    expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));

    mockS3Send.mockImplementation((command) => {
      if (command instanceof PutObjectCommand) {
        expect(command.input.Bucket).toBe('test-bucket');
        expect(command.input.Key).toBe('test-image.jpg');
        expect(command.input.ContentType).toBe('image/jpeg');
        expect(command.input.Metadata.passportNationality).toBe('UK');
        return Promise.resolve();
      }
      return Promise.reject(new Error('Invalid command'));
    });

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Image uploaded successfully!' }),
    });
  });

  test('should return 400 for invalid input', async () => {
    const mockEvent = {
      body: null,
      queryStringParameters: null,
    };

    const result = await handler(mockEvent);

    expect(mockS3Send).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        message:
          'Invalid input. Must provide imageBase64 and fileName in the URL path.',
      }),
    });
  });

  test('should handle S3 upload error', async () => {
    const mockEvent = {
      body: JSON.stringify({
        imageBase64: Buffer.from('test-image').toString('base64'),
        nationality: 'UK',
      }),
      queryStringParameters: { filename: 'test-image.jpg' },
    };

    mockS3Send.mockRejectedValueOnce(new Error('S3 upload failed'));

    const result = await handler(mockEvent);

    expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to upload image.',
        error: 'S3 upload failed',
      }),
    });
  });
});
