import { ImageResponse } from "next/og";
import { oswald } from "@/lib/brand-font";

// App icons (browser tab, Android home screen). Generated at build time.
export function generateImageMetadata() {
  return [192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const size = Number(await id) || 192;
  return new ImageResponse(<Mark size={size} />, {
    width: size,
    height: size,
    fonts: [{ name: "Oswald", data: await oswald(), weight: 600, style: "normal" }],
  });
}

export function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#d4af37",
        fontFamily: "Oswald",
        fontSize: size * 0.36,
        letterSpacing: size * 0.01,
      }}
    >
      ABZ
    </div>
  );
}
