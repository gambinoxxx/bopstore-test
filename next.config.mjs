/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        unoptimized: true
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('bufferutil', 'utf-8-validate');
        }
        return config;
    }
};

export default nextConfig;
