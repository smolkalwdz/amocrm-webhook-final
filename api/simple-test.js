// Очень простая тестовая функция
module.exports = async (req, res) => {
  console.log('✅ Simple test function called');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.status(200).json({
    success: true,
    message: 'Simple test works!',
    timestamp: new Date().toISOString()
  });
}; 