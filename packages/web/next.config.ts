import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@mcphealth/shared"],
};

export default nextConfig;
