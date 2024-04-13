/** @type {import('next').NextConfig} */
import CopyPlugin from "copy-webpack-plugin";

const nextConfig = {
  webpack: (config, { dev }) => {
    // This configures webpack to handle txt and json files in a specific server-side folder
    config.node = {
      __dirname: false,
    };

    // Configure the CopyPlugin
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "src/bot/prompts",
            to: "server/src/bot/prompts",
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
    return config;
  },
  experimental: {
    // node-fetch will throw some exceptions for bot SDK if this is enabled
    // see https://github.com/vercel/next.js/issues/55682 for more info
    serverMinification: false,
  },
};

export default nextConfig;
