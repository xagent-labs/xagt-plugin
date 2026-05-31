import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(145deg, #0c1018 0%, #141c28 100%)",
          border: "2px solid rgba(61, 232, 255, 0.45)",
        }}
      >
        <svg width="96" height="96" viewBox="0 0 32 32" fill="none">
          <path
            fill="#3de8ff"
            d="M16 6.5 17.35 12.2 23 13.55 17.35 14.9 16 20.5 14.65 14.9 9 13.55 14.65 12.2Z"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
