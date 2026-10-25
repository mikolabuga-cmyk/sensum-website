export default {
 staticDirs: process.env.npm_lifecycle_event === "storybook" ? ["../.storybook-public"] : [],
 stories: ['../stories/**/*.stories.js'],
 addons: ['@storybook/addon-docs'],
 framework: '@storybook/html-vite',
 core: { disableTelemetry: true },
 async viteFinal(config) { config.base = './'; return config; }
};
