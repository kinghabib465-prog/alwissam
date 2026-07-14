import type { NextConfig } from "next";

// standalone فقط لـ Docker / استضافة حاوية.
// منصات مثل Vercel تحتاج مخرجات Next الافتراضية.
const useStandalone =
  process.env.DOCKER_BUILD === "1" || process.env.OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ioredis", "pg"],
  turbopack: {
    // تثبيت الجذر على مجلد المشروع وليس C:\Users\STAR
    root: process.cwd(),
  },
};

export default nextConfig;
