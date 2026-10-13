import { withRedirects } from 'redirectkit/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Existing user redirects to verify seamless merging
  async redirects() {
    return [
      {
        source: '/from-custom-next-config',
        destination: '/about',
        permanent: false
      }
    ];
  }
};

export default withRedirects(nextConfig);
