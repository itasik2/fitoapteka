// app/api/upload/product-image/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/adminGuard";

const MAX_MB = 10;

function hasCloudinaryConfig() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function extensionFromImage(file: File) {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };

  if (file.type && byMime[file.type]) return byMime[file.type];

  const fromName = file.name?.split(".").pop()?.toLowerCase() || "";
  return fromName.replace(/[^a-z0-9]/g, "") || "jpg";
}

async function saveToLocalPublicUploads(file: File, bytes: Buffer) {
  const ext = extensionFromImage(file);
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;

  const relativeDir = path.join("uploads", "products");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const absoluteFilePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absoluteFilePath, bytes);

  return `/${relativeDir}/${fileName}`;
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "only_images_allowed" }, { status: 400 });
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large", maxMB: MAX_MB }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (!hasCloudinaryConfig()) {
      const localUrl = await saveToLocalPublicUploads(file, bytes);
      return NextResponse.json({ url: localUrl, storage: "local" }, { status: 200 });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "fitoapteka/products",
          resource_type: "image",
          eager: [
            {
              width: 1200,
              crop: "limit",
              fetch_format: "auto",
              quality: "auto:good",
            },
          ],
          eager_async: false,
        },
        (err, res) => {
          if (err || !res) reject(err || new Error("upload_failed"));
          else resolve(res);
        }
      );

      stream.end(bytes);
    });

    const optimizedUrl = result?.eager?.[0]?.secure_url || result?.secure_url || "";

    if (!optimizedUrl) {
      return NextResponse.json({ error: "no_url_returned" }, { status: 500 });
    }

    return NextResponse.json(
      {
        url: optimizedUrl,
        originalUrl: result?.secure_url,
        storage: "cloudinary",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
