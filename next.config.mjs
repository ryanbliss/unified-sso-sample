/** @type {import('next').NextConfig} */
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig = {
  webpack: (config, { dev }) => {
    // The condition is to have the plugin on build time, not to perturb live refresh
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        cldr$: "cldrjs",
        cldr: "cldrjs/dist/cldr",
      };
    }
    config.module.rules.push({
      test: /\.txt$/i,
      use: "raw-loader",
    });
    return config;
  },
  experimental: {
    // node-fetch will throw some exceptions for bot SDK if this is enabled
    // see https://github.com/vercel/next.js/issues/55682 for more info
    serverMinification: false,
    outputFileTracingExcludes: {
      "*": [
        "node_modules/webpack",
        "node_modules/fs-extra",
        "node_modules/fs-realpath",
        "node_modules/fs-minipath",
      ],
    },
  },
};

const bundleAnalyzerConfigWrapper = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
});

export default bundleAnalyzerConfigWrapper(nextConfig);
