import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string[] }> }) {
  const { name: nameParts } = await params;
  const serverName = decodeURIComponent(nameParts.join("/"));

  // Try to fetch score
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let score: number | null = null;
  let status = "unknown";
  try {
    const res = await fetch(`${apiUrl}/api/servers/${encodeURIComponent(serverName)}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      score = data.trustScore;
      status = data.currentStatus || "unknown";
    }
  } catch {}

  const statusColor = status === "up" ? "#22c55e" : status === "degraded" ? "#eab308" : status === "down" ? "#ef4444" : "#6b7280";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #030712 0%, #0a1628 50%, #030712 100%)",
          color: "#f3f4f6",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <p style={{ fontSize: "20px", color: "#6b7280", marginBottom: "8px" }}>MCPHealth</p>
        <p style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-1px", textAlign: "center", marginBottom: "32px" }}>
          {serverName}
        </p>
        <div style={{ display: "flex", gap: "48px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: statusColor, marginBottom: "8px" }} />
            <span style={{ fontSize: "22px", color: "#9ca3af", textTransform: "capitalize" }}>{status}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "64px", fontWeight: 800, color: score !== null && score >= 70 ? "#22c55e" : score !== null && score >= 40 ? "#eab308" : "#ef4444" }}>
              {score !== null ? Math.round(score) : "—"}
            </span>
            <span style={{ fontSize: "22px", color: "#9ca3af" }}>Trust Score</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
