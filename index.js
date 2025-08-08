module.exports = (req, res) => {
  res.json({ 
    message: 'Root endpoint working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/api/webhook',
      test: '/api/test'
    }
  });
}; 