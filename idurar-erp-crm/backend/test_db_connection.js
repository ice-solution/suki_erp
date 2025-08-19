require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

console.log('Testing database connection...');
console.log('Database URL:', process.env.DATABASE);

mongoose.connect(process.env.DATABASE, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Database connected successfully!');
  
  // Load models
  require('./src/models/appModels/ContractorEmployee');
  
  // Test query
  const ContractorEmployee = mongoose.model('ContractorEmployee');
  ContractorEmployee.findOne({ phone: '98765432' })
    .then(employee => {
      if (employee) {
        console.log('✅ Found employee:', employee.name);
      } else {
        console.log('❌ No employee found with phone 98765432');
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Query failed:', err.message);
      process.exit(1);
    });
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Database connection error:', error.message);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ Database disconnected');
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Database connection timeout');
  process.exit(1);
}, 15000);
