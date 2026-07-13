import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ioredis"],
  turbopack: {
    // تثبيت الجذر على مجلد المشروع وليس C:\Users\STAR
    root: process.cwd(),
  },
};

export default nextConfig;
