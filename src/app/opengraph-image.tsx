import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { oswald } from "@/lib/brand-font";

// The preview card shown when the site link is shared (Instagram, WhatsApp, iMessage…). Generated at build time.
export const alt = "Coached by ABZ: build muscle, lose fat, get stronger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const hero = await readFile(path.join(process.cwd(), "public/images/hero.jpg"));
  const heroSrc = `data:image/jpeg;base64,${hero.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a", fontFamily: "Oswald" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px" }}>
          <div style={{ display: "flex", fontSize: 40, color: "#f4efe4", letterSpacing: 1 }}>
            COACHED BY&nbsp;<span style={{ color: "#d4af37" }}>ABZ</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36, fontSize: 84, lineHeight: 1, color: "#f4efe4" }}>
            <span>BUILD MUSCLE.</span>
            <span>LOSE FAT.</span>
            <span style={{ color: "#d4af37" }}>GET STRONGER.</span>
          </div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "#a3a3a3", letterSpacing: 4 }}>ONLINE COACHING</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc} width={420} height={630} style={{ objectFit: "cover", objectPosition: "50% 40%" }} alt="" />
      </div>
    ),
    { ...size, fonts: [{ name: "Oswald", data: await oswald(), weight: 600, style: "normal" }] },
  );
}
