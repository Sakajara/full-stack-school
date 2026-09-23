/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static site: Firebase Hosting serves it on the free plan, and all data
  // access goes from the browser to Firestore under firestore.rules.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
