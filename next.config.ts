import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal server.js + traced node_modules for the web container: a cold start with
  // `next start` on Cloud Run measured 14.9 s to first byte (see PHASES.md, Phase 5).
  output: "standalone",
  experimental: {
    serverActions: {
      // RAG document uploads go through a Server Action; documents are capped at 5MB,
      // plus headroom for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
