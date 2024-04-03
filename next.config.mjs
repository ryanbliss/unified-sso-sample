/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { dev }) => {
        // The condition is to have the plugin on build time, not to perturb live refresh
        if (!dev) {
            config.resolve.alias = {
                'cldr$': 'cldrjs',
                'cldr': 'cldrjs/dist/cldr'
            };
        }
        return config;
    },
};

export default nextConfig;
