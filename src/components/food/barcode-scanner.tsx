"use client";
import { useEffect, useRef, useState } from "react";

type Status = "starting" | "scanning" | "denied" | "unsupported" | "error";

/**
 * Live camera barcode scanner. Reading happens on the phone; no image leaves the device.
 * Uses a WebAssembly barcode reader served from this site (Safari has no built-in one).
 */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: number | undefined;
    const stop = () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      try {
        const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
        prepareZXingModule({
          overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/vendor/zxing_reader.wasm" : prefix + path) },
        });
        const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped || !video.current) return stop();
        video.current.srcObject = stream;
        await video.current.play();
        setStatus("scanning");
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            const code = found.map((b) => b.rawValue).find((v) => /^\d{8,14}$/.test(v));
            if (code) {
              stop();
              navigator.vibrate?.(40);
              onCode(code);
              return;
            }
          } catch {
            /* frame not ready yet */
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        setStatus((e as Error)?.name === "NotAllowedError" ? "denied" : "error");
      }
    })();
    return stop;
  }, [onCode]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "4 / 3" }}>
        <video ref={video} playsInline muted className="h-full w-full object-cover" aria-label="Camera view for scanning a barcode" />
        {status === "scanning" && (
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-gold/80" />
        )}
        {status !== "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-mute">
            {status === "starting" && "Starting camera…"}
            {status === "denied" && "Camera access is off. Turn it on in Settings → Safari → Camera, or type the barcode below."}
            {status === "unsupported" && "This browser can't use the camera. Type the barcode below instead."}
            {status === "error" && "The camera couldn't start. Type the barcode below instead."}
          </div>
        )}
      </div>
      {status === "scanning" && <p className="mt-2 text-center text-sm text-mute">Point the camera at the barcode and hold steady.</p>}
    </div>
  );
}
