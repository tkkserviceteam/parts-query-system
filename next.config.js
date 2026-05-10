/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
//  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
async rewrites() {
    return [
      {
        // 當使用者訪問 /tkkweb/... 時
        source: '/tkkweb/:path*',
        // 伺服器會在背後偷偷去抓這個 HTTP 的 IP 資料
        destination: 'http://211.75.18.228/tkkweb/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
