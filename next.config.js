const withNextIntl = require('next-intl/plugin')('./i18n.config.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig); 