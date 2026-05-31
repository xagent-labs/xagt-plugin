import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*;
  font-src 'self' data:;
  connect-src 'self' https://* wss://*;
  frame-src 'self' https://auth.privy.io;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["expediential-derangeable-cordie.ngrok-free.dev"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "expediential-derangeable-cordie.ngrok-free.dev"],
    },
  },
  async headers() {
    const headersList = [
      {
        key: "Content-Security-Policy",
        value: cspHeader.replace(/\n/g, ""),
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headersList.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: headersList,
      },
    ];
  },
};

export default nextConfig;