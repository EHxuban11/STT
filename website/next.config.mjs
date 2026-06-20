import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a subfolder of a larger repo that has its own lockfile.
  // Pin the file-tracing root to this folder so Next.js doesn't warn about /
  // mis-detect the workspace root when building (locally or on Vercel).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
