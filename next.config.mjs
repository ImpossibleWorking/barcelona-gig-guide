/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.barcelonagigguide.com" }],
        destination: "https://barcelonagigguide.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
