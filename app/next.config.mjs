/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The design system is a local file: dependency shipped as ESM + CSS; let Next
  // transpile it (and resolve its "./styles.css" export) from the workspace.
  transpilePackages: ["@family-archive/ui"],
};

export default nextConfig;
