/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "build",
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = "electron-renderer";
    }
    return config;
  }
};

export default nextConfig;
