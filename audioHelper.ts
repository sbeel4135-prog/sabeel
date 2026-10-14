/**
 * Audio Recording & Media Helper Utilities
 * Compatible with Safari, iPadOS, iOS, Android, and Desktop
 */

// Convert Blob/File to pure Base64 string via ArrayBuffer (no data URI header, memory-safe)
export async function arrayBufferToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 16384;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)) as any);
  }
  return btoa(binary);
}

// Dynamically check supported MIME types with Safari/iPadOS priority
export function getSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  const mimeType = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );

  return mimeType;
}

// Request microphone stream with clean plain options { audio: true }
export async function getAudioMediaStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('متصفحك الحالي لا يدعم ميزة تسجيل الصوت المباشر.');
  }

  return await navigator.mediaDevices.getUserMedia({ audio: true });
}

// Handle error logging and messaging strictly distinguishing permission denial from other errors
export function formatMicErrorMessage(err: any): string {
  console.error('Mic error:', err?.name, err?.message);
  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    return 'تعذر الوصول إلى الميكروفون. يرجى السماح بإذن استخدام الميكروفون في المتصفح ثم المحاولة مرة أخرى.';
  }
  return err?.message || 'تعذر تشغيل الميكروفون.';
}
