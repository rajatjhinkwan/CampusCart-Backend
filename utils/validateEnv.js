const REQUIRED_IN_PROD = ['MONGO_URI', 'JWT_SECRET'];

function validateEnv() {
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    return;
  }
  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { validateEnv };

