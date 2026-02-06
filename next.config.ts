import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@sparticuz/chromium-min"],
  outputFileTracingIncludes: {
    "app/api/milestone-reports/submit/route.ts": [
      "./node_modules/@sparticuz/chromium-min/**"
    ]
  }
};

export default nextConfig;
