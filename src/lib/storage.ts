import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Photos never live under /public. They're read back only through /api/photos/[id],
// which checks the viewer is the client or their coach.

const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
const localDir = path.resolve(process.env.STORAGE_DIR || "./storage");

let s3: S3Client | null = null;
function s3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY_ID
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" }
        : undefined,
    });
  }
  return s3;
}

function safeLocalPath(key: string) {
  if (!/^[a-z0-9/_-]+\.(jpg|png|webp)$/i.test(key) || key.includes("..")) throw new Error("bad key");
  return path.join(localDir, key);
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (driver === "s3") {
    await s3Client().send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
    );
    return;
  }
  const p = safeLocalPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    if (driver === "s3") {
      const res = await s3Client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    }
    return await fs.readFile(safeLocalPath(key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  try {
    if (driver === "s3") {
      await s3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    } else {
      await fs.unlink(safeLocalPath(key));
    }
  } catch {
    /* already gone */
  }
}

/** Identify an image by its first bytes rather than trusting the browser's content type. */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}
