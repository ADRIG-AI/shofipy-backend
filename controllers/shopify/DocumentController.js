// controllers/shopify/DocumentController.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function getDocument(req, res) {
  const { documentUrl } = req.query;

  if (!documentUrl) {
    return res.status(400).json({ error: "Missing document URL" });
  }

  try {
    const url = new URL(documentUrl);

    // 👇 Use the bucket we already trust
    const bucket = process.env.S3_BUCKET;

    // Strip the bucket part (if present) and decode the rest
    let key = url.pathname;
    if (key.startsWith(`/${bucket}/`)) key = key.slice(bucket.length + 2); // +2 for leading '/'
    key = key.replace(/^\/+/, "");            // remove any leading slash(es)
    key = decodeURIComponent(key);            // handle spaces, utf‑8, etc.

    const { Body, ContentType, ContentLength } = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    res.setHeader("Content-Type", ContentType ?? "application/octet-stream");
    if (ContentLength) res.setHeader("Content-Length", ContentLength);
    res.setHeader("Content-Disposition", `inline; filename="${key.split("/").pop()}"`);

    if (Body instanceof Readable) {
      Body.pipe(res);
    } else {
      const buf = await Body.transformToByteArray(); // browser runtime
      res.end(Buffer.from(buf));
    }
  } catch (err) {
    console.error("Error fetching document:", err);
    res.status(err.$metadata?.httpStatusCode ?? 500).json({
      error: "Failed to fetch document",
      detail: err.name,
    });
  }
}
