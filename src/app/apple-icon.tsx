import { ImageResponse } from "next/og";
import { oswald } from "@/lib/brand-font";
import { Mark } from "./icon";

// iPhone home screen icon (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(<Mark size={180} />, {
    ...size,
    fonts: [{ name: "Oswald", data: await oswald(), weight: 600, style: "normal" }],
  });
}
