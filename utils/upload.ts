// 이미지·영상 업로드 (Supabase Storage).
//
// ⚠️ 배경: ImagePicker가 돌려주는 uri는 웹에서 `blob:`, 네이티브에서 `file://` 로컬 경로다.
//    이걸 그대로 DB에 저장하면 새로고침하면 죽고 다른 사용자에게는 처음부터 안 보인다.
//    반드시 이 함수를 거쳐 Storage에 올린 뒤 공개 URL을 저장할 것.
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../config/supabase';

export const MEDIA_BUCKET = 'media';

// 업로드 대상별 폴더. Storage 정책이 `<folder>/<uid>/...` 경로로 소유권을 판별한다.
export type MediaFolder = 'avatars' | 'gyms' | 'posts' | 'reviews';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const canUpload = (userId?: string) =>
  isSupabaseConfigured && !!userId && UUID_RE.test(userId);

// 업로드 전 축소 기준. 목록·상세에서 쓰는 크기를 감안하면 긴 변 1600px이면 충분하다.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * 긴 변을 max에 맞춘 목표 크기. 이미 작으면 null(축소 불필요).
 * 비율을 유지하되 0px이 나오지 않도록 최소 1px을 보장한다.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_DIMENSION,
): { w: number; h: number } | null {
  if (!(width > 0) || !(height > 0)) return null;
  const longest = Math.max(width, height);
  if (longest <= max) return null;
  const scale = max / longest;
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * 이미지를 긴 변 기준으로 축소해 JPEG로 재인코딩한다.
 *
 * ⚠️ ImagePicker의 `quality` 옵션은 네이티브에서만 적용된다. 웹에서는 원본이 그대로 올라와
 *    2MB짜리 PNG가 목록에 여러 장 뜨면 눈에 띄게 느려진다. 그래서 웹에서만 canvas로 축소한다.
 *    (네이티브는 ImagePicker quality 0.8이 이미 적용됨 — 더 줄이려면 expo-image-manipulator 필요)
 * 실패하면 원본을 그대로 반환한다 — 축소는 최적화일 뿐 업로드를 막아선 안 된다.
 */
async function downscaleImage(blob: Blob): Promise<Blob> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return blob;
  if (!blob.type.startsWith('image/') || blob.type === 'image/gif') return blob;

  try {
    const bitmap = await createImageBitmap(blob);
    const target = fitWithin(bitmap.width, bitmap.height);
    if (!target) { bitmap.close?.(); return blob; }
    const { w, h } = target;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return blob; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const out: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
    );
    // 축소했는데 오히려 커졌으면(이미 잘 압축된 원본) 원본을 쓴다.
    return out && out.size > 0 && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

// 네이티브에는 Blob.type이 없으므로 확장자로 MIME을 정한다.
// Storage에 contentType이 틀리면 브라우저가 이미지를 다운로드로 처리하거나 영상이 재생되지 않는다.
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
};

export function mimeFromUri(uri: string): string {
  const m = uri.split('?')[0].match(/\.([a-z0-9]+)$/i);
  const ext = m ? m[1].toLowerCase() : '';
  return MIME_BY_EXT[ext] ?? 'image/jpeg';
}

function extFromUri(uri: string, mime?: string): string {
  const fromMime = mime?.split('/')[1]?.split(';')[0];
  if (fromMime && /^[a-z0-9]+$/i.test(fromMime)) return fromMime === 'jpeg' ? 'jpg' : fromMime;
  const m = uri.split('?')[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

/**
 * 로컬 uri(blob:/file://)를 Storage에 올리고 공개 URL을 반환한다.
 * 실패하면 null을 반환한다 — 호출부는 원본 uri를 저장하지 말고 사진 없이 진행할 것.
 */
export async function uploadMedia(
  uri: string,
  folder: MediaFolder,
  userId: string,
): Promise<string | null> {
  if (!uri || !canUpload(userId)) return null;
  // 이미 업로드된 원격 URL이면 다시 올리지 않는다(수정 화면 재저장 대비).
  if (/^https?:\/\//i.test(uri)) return uri;

  try {
    const mime = mimeFromUri(uri);
    const ext = extFromUri(uri, mime);
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // ⚠️ 웹과 네이티브는 파일을 읽는 방법이 다르다.
    //    · 웹      : blob: uri → fetch → Blob (canvas 축소도 여기서만 가능)
    //    · 네이티브 : file:// → expo-file-system의 File.arrayBuffer()
    //      RN의 Blob을 Supabase Storage에 그대로 넘기면 **0바이트 파일이 올라간다**(알려진 이슈).
    //      반드시 ArrayBuffer로 변환해서 넘길 것.
    let body: Blob | ArrayBuffer;
    let contentType = mime;

    if (Platform.OS === 'web') {
      const raw = await (await fetch(uri)).blob();
      if (!raw || raw.size === 0) return null;
      const blob = raw.type.startsWith('image/') ? await downscaleImage(raw) : raw;
      body = blob;
      contentType = blob.type || mime;
    } else {
      const { File } = await import('expo-file-system');
      const buf = await new File(uri).arrayBuffer();
      if (!buf || buf.byteLength === 0) return null;
      body = buf;
      // 네이티브는 ImagePicker의 quality 옵션으로 이미 축소된 상태다(canvas 사용 불가).
    }

    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body, {
      contentType,
      upsert: false,
    });
    if (error) return null;

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/** 여러 장을 순서대로 올린다. 실패한 항목은 결과에서 빠진다. */
export async function uploadMediaMany(
  uris: string[],
  folder: MediaFolder,
  userId: string,
): Promise<string[]> {
  const out: string[] = [];
  for (const u of uris) {
    const url = await uploadMedia(u, folder, userId);
    if (url) out.push(url);
  }
  return out;
}

/** 아직 업로드되지 않은 로컬 uri인지 (저장 전 검사용) */
export const isLocalUri = (uri?: string) =>
  !!uri && !/^https?:\/\//i.test(uri);
