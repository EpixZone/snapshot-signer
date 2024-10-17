/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  basePath: '/snapshot-signer',
  assetPrefix: '/snapshot-signer/',
}

module.exports = nextConfig;