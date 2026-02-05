import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

let _s3Client = null;

function getS3Client() {
  if (_s3Client) return _s3Client;

  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_S3_API_URL;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error('⚠️ R2 env vars missing');
  }

  _s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  });

  return _s3Client;
}

export async function uploadJson(key, jsonString) {
  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: jsonString,
    ContentType: 'application/json'
  });
  await s3.send(command);
  return key;
}

export async function getJson(key) {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key
  });
  const response = await s3.send(command);
  const body = await response.Body.transformToString();
  return body;
}
