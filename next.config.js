/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  basePath: '',
  assetPrefix: '',
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
};

module.exports = nextConfig;
