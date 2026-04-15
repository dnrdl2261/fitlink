module.exports = ({ config }) => {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: {
      ...(config.experiments || {}),
      baseUrl,
    },
  };
};
