import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "MCP Server Health & Trust Scores";
  const score = searchParams.get("score");
  const status = searchParams.get("status");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0a0a0f 0%, #111827 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(74, 222, 128, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              border: "1px solid rgba(74, 222, 128, 0.3)",
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, color: "#e5e7eb" }}>MCPHealth</span>
        </div>

        <h1
          style={{
            fontSize: score ? "48px" : "56px",
            fontWeight: 800,
            color: "#f9fafb",
            lineHeight: 1.1,
            marginBottom: "16px",
            maxWidth: "900px",
          }}
        >
          {title}
        </h1>

        {score && (
          <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                borderRadius: "12px",
                padding: "8px 20px",
              }}
            >
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#4ade80" }}>{score}</span>
              <span style={{ fontSize: "16px", color: "#9ca3af" }}>Trust Score</span>
            </div>
            {status && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: status === "up" ? "#4ade80" : status === "degraded" ? "#facc15" : "#f87171",
                  }}
                />
                <span style={{ fontSize: "20px", color: "#9ca3af", textTransform: "capitalize" }}>{status}</span>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: "18px", color: "#6b7280", marginTop: "auto" }}>
          Real-time health monitoring for MCP servers
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
