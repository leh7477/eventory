import { ImageResponse } from "next/og";

// 링크 공유 썸네일 (OG 이미지) — EVENT LAND 브랜드로 동적 생성
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 빌드타임 프리렌더 대신 요청 시 생성
export const alt = "EVENT LAND — 가챠머신·룰렛 등 이벤트 장비 렌탈";
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
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#2B2233",
        }}
      >
        {/* 워드마크 */}
        <div
          style={{
            fontSize: 168,
            fontWeight: 800,
            letterSpacing: 8,
            lineHeight: 1,
            display: "flex",
          }}
        >
          EVENT LAND
        </div>

        {/* 코랄 포인트 라인 */}
        <div
          style={{
            marginTop: 40,
            width: 120,
            height: 8,
            borderRadius: 8,
            background: "#FF4D6D",
          }}
        />

        {/* 서브 문구 */}
        <div
          style={{
            marginTop: 40,
            fontSize: 40,
            fontWeight: 700,
            display: "flex",
          }}
        >
          Every Event Has a Story
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: "#8A8391",
            letterSpacing: 6,
            display: "flex",
          }}
        >
          EVENT EQUIPMENT RENTAL
        </div>
      </div>
    ),
    { ...size }
  );
}
