module.exports = (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}; 