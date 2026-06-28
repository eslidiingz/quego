import { ImageResponse } from "next/og";

// Branded social-share card for the home page (LINE / Facebook / X previews).
export const alt = "Quego — ไม่ต้องรอเก้อ แค่กดจอง";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Fetch a Google Font as a TTF/OTF buffer for satori (ImageResponse).
 * The css2 endpoint returns a truetype/opentype `src` URL for generic UAs.
 * Returns null on any failure so the card still renders (Latin via default).
 */
async function loadFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(
      text,
    )}`;
    const css = await (await fetch(url)).text();
    const src = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
    )?.[1];
    if (!src) return null;
    return await (await fetch(src)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const wordmark = "quego";
  const headline = "ไม่ต้องรอเก้อ แค่กดจอง";
  const sub = "จองคิวร้านและธุรกิจบริการ · ดูคิวเรียลไทม์ · แจ้งเตือนผ่าน LINE";

  const [anuphan, sora] = await Promise.all([
    loadFont("Anuphan", 700, headline + sub),
    loadFont("Sora", 700, wordmark),
  ]);

  const fonts = [
    anuphan && {
      name: "Anuphan",
      data: anuphan,
      weight: 700 as const,
      style: "normal" as const,
    },
    sora && {
      name: "Sora",
      data: sora,
      weight: 700 as const,
      style: "normal" as const,
    },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 700;
    style: "normal";
  }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0f2e2b 0%, #14403b 45%, #1d5a4f 100%)",
          color: "#ffffff",
          fontFamily: anuphan ? "Anuphan" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
            fontFamily: sora ? "Sora" : "sans-serif",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#f5d9a8",
          }}
        >
          {wordmark}
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            maxWidth: "900px",
          }}
        >
          {headline}
        </div>
        <div
          style={{
            marginTop: "32px",
            fontSize: 34,
            color: "rgba(255,255,255,0.82)",
            maxWidth: "950px",
          }}
        >
          {sub}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
