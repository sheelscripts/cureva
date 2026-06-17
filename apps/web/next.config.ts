import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cureva/backend",
    "@cureva/agents",
    "@cureva/mcp",
    "@cureva/rag",
    "@cureva/prompts",
    "@cureva/ml",
    "@cureva/eval"
  ]
};

export default nextConfig;
