import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@golab/pdf-templates", "@golab/shared", "@golab/database"],
};

export default nextConfig;
