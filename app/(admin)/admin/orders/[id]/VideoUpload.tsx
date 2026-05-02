"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "selected" | "compressing" | "uploading" | "done" | "error";

const COMPRESS_THRESHOLD = 20 * 1024 * 1024; // 20 MB
const TARGET_BITRATE = 1_200_000; // 1.2 Mbps
const MAX_WIDTH = 720;

async function compressVideo(file: File, onProgress: (p: number) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const duration = video.duration;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.onerror = reject;

      recorder.start(200);

      let rafId: number;
      function draw() {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, w, h);
        if (duration > 0) onProgress(video.currentTime / duration);
        rafId = requestAnimationFrame(draw);
      }

      video.onplay = () => { rafId = requestAnimationFrame(draw); };
      video.onended = () => {
        cancelAnimationFrame(rafId);
        recorder.stop();
      };
      video.onerror = () => { cancelAnimationFrame(rafId); reject(new Error("video error")); };

      video.currentTime = 0;
      video.play().catch(reject);
    };

    video.onerror = () => reject(new Error("cannot load video"));
  });
}

export function VideoUpload({ orderId }: { orderId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("กรุณาเลือกไฟล์วิดีโอ");
      return;
    }
    setFile(f);
    setPhase("selected");
    setError("");
  }

  async function handleUpload() {
    if (!file) return;
    setError("");

    let blob: Blob = file;

    if (file.size > COMPRESS_THRESHOLD) {
      setPhase("compressing");
      setProgress(0);
      try {
        blob = await compressVideo(file, (p) => setProgress(Math.round(p * 100)));
      } catch {
        setError("บีบอัดไฟล์ไม่สำเร็จ — ลองเลือกไฟล์ใหม่");
        setPhase("selected");
        return;
      }
    }

    setPhase("uploading");
    setProgress(0);

    const form = new FormData();
    form.append("file", blob, file.name.replace(/\.[^.]+$/, ".webm"));

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/video`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "upload failed");
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      setPhase("selected");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        อัปโหลดวิดีโอยืนยัน
      </p>

      <div
        onClick={() => phase === "idle" || phase === "selected" ? inputRef.current?.click() : undefined}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors
          ${phase === "idle" || phase === "selected"
            ? "border-zinc-700 hover:border-zinc-500 cursor-pointer"
            : "border-zinc-800 cursor-default"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {phase === "idle" && (
          <>
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-sm text-zinc-300 font-medium">แตะเพื่อเลือกวิดีโอ</p>
            <p className="text-xs text-zinc-600 mt-1">ไฟล์ &gt; 20 MB จะถูกบีบอัดอัตโนมัติ</p>
          </>
        )}

        {phase === "selected" && file && (
          <>
            <p className="text-3xl mb-2">🎥</p>
            <p className="text-sm text-zinc-200 font-medium truncate px-4">{file.name}</p>
            <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB
              {file.size > COMPRESS_THRESHOLD && " · จะบีบอัดก่อนอัปโหลด"}
            </p>
          </>
        )}

        {(phase === "compressing" || phase === "uploading") && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">
              {phase === "compressing" ? "กำลังบีบอัด..." : "กำลังอัปโหลด..."}
            </p>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-brand h-1.5 rounded-full transition-all duration-300"
                style={{ width: phase === "uploading" ? "100%" : `${progress}%` }}
              />
            </div>
            {phase === "compressing" && (
              <p className="text-xs text-zinc-500">{progress}%</p>
            )}
          </div>
        )}

        {phase === "done" && (
          <>
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm text-brand font-medium">อัปโหลดสำเร็จ</p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {phase === "selected" && (
        <button
          onClick={handleUpload}
          className="w-full bg-zinc-800 text-white py-3 rounded-2xl font-semibold text-sm
            hover:bg-zinc-700 transition-colors"
        >
          {file && file.size > COMPRESS_THRESHOLD ? "บีบอัด & อัปโหลด" : "อัปโหลด"}
        </button>
      )}
    </div>
  );
}
