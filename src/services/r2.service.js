import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const endpoint = process.env.R2_S3_API_URL;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
  console.warn('⚠️ R2 env vars missing – journey upload will be skipped');
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey }
});

const Bucket = bucket;

export async function uploadJson(key, jsonString) {
  const command = new PutObjectCommand({
    Bucket,
    Key: key,
    Body: jsonString,
    ContentType: 'application/json'
  });
  await s3.send(command);
  return key;
}

export async function getJson(key) {
  const command = new GetObjectCommand({ Bucket, Key: key });
  const response = await s3.send(command);
  const body = await response.Body.transformToString();
  return body;
}
