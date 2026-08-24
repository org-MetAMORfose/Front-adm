import "server-only";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | undefined;

function getS3Config() {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  const region = process.env.AWS_REGION?.trim();

  if (!bucket) {
    throw new Error("S3_BUCKET_NAME is not configured on the server.");
  }

  if (!region) {
    throw new Error("AWS_REGION is not configured on the server.");
  }

  return { bucket, region };
}

function getS3Client(region: string) {
  if (!s3Client) {
    s3Client = new S3Client({ region });
  }

  return s3Client;
}

export async function getS3Media(mediaPath: string) {
  const { bucket, region } = getS3Config();

  return getS3Client(region).send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: mediaPath
    })
  );
}
