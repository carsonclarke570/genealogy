/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The design system is a local file: dependency shipped as ESM + CSS; let Next
  // transpile it (and resolve its "./styles.css" export) from the workspace.
  transpilePackages: ["@family-archive/ui"],
  // better-sqlite3 is a native addon — keep it external so Next doesn't try to
  // bundle the .node binary into the server build.
  experimental: { serverComponentsExternalPackages: ["better-sqlite3"] },
};

export default nextConfig;
