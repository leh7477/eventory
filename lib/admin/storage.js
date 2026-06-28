import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/constants";

// 이미지 파일(File/Blob)을 sharp로 변환·리사이즈 후 Storage에 업로드.
// - 원본: WebP, 최대 1920px (가로/세로 fit inside)
// - 썸네일: 400x300 WebP (cover)
// 반환: { url, thumbUrl }
export async function processAndUpload(file, prefix = "img") {
  const buf = Buffer.from(await file.arrayBuffer());

  const main = await sharp(buf)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const thumb = await sharp(buf)
    .rotate()
    .resize(400, 300, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  const base = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mainPath = `${base}.webp`;
  const thumbPath = `${base}_thumb.webp`;

  const admin = createAdminClient();
  const up1 = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(mainPath, main, { contentType: "image/webp", upsert: false });
  if (up1.error) throw new Error("이미지 업로드 실패: " + up1.error.message);

  const up2 = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(thumbPath, thumb, { contentType: "image/webp", upsert: false });
  if (up2.error) throw new Error("썸네일 업로드 실패: " + up2.error.message);

  const { data: m } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(mainPath);
  const { data: t } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(thumbPath);

  return { url: m.publicUrl, thumbUrl: t.publicUrl, path: mainPath, thumbPath };
}
