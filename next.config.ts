import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // RAG document uploads go through a Server Action; documents are capped at 5MB,
      // plus headroom for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
