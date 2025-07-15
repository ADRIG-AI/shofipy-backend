// controllers/shopify/uploadToS3.js
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from "mime-types";          // npm i mime-types

export async function uploadToS3(pdfBuffer, fileName) {
  /* ── pull env vars into locals just like the example ──────────────── */
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region    = process.env.S3_REGION;
  const Bucket    = process.env.S3_BUCKET;

  /* ── S3 client ────────────────────────────────────────────────────── */
  const s3Client = new S3Client({
    credentials: {
      accessKeyId:     accessKey,
      secretAccessKey: secretKey,
    },
    region,
  });

  /* ── PARAMS remodelled to match the pattern you showed ────────────── */
  const uploadParams = {
    ACL: "public-read",                                     // <─ NEW
    Bucket,                                                 // <─ uses local var
    Key: `invoices/${Date.now()}-${fileName}`,              // <─ templated path
    Body: pdfBuffer,
    ContentType: mime.lookup(fileName) || "application/pdf" // <─ mime‑types
  };

  /* ── perform the upload ──────────────────────────────────────────── */
  const uploader = new Upload({ client: s3Client, params: uploadParams });
  const result   = await uploader.done();       // result.Location is the HTTPS URL

  return result.Location;                       // e.g. https://miporis.s3.eu‑north‑1.amazonaws.com/…
}
