// Global test setup
beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.SECRET_TOKEN = 'test-secret-key';
  process.env.ACCESS_TOKEN_EXPIRY = '15m';
  process.env.REFRESH_TOKEN_EXPIRY = '1d';
});

afterAll(() => {
  // Cleanup
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
