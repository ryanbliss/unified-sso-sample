/** @type {import('next').NextConfig} */
import CopyPlugin from "copy-webpack-plugin";

const nextConfig = {
  webpack: (config, { dev }) => {
    // Configure the CopyPlugin
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "src/bot/prompts",
            to: "src/bot/prompts",
          },
        ],
      })
    );

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
    outputFileTracingIncludes: {
      "/src/bot": ["./prompts/**/*"],
    },
  },
};

export default nextConfig;
