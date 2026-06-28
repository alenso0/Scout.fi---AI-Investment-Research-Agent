import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>SCOUT.FI</div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#6b6b6b", maxWidth: 800 }}>
          Give it a company name. It researches it and returns an evidence-backed
          Invest / Watch / Pass verdict — with every claim cited.
        </div>
      </div>
    ),
    { ...size }
  );
}
