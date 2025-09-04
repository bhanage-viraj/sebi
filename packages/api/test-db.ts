// Test database connection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model('Test', testSchema);
    const testDoc = new Test({ name: 'Connection Test' });
    await testDoc.save();
    console.log('✅ Successfully created test document');
    
    // Clean up
    await Test.deleteOne({ _id: testDoc._id });
    console.log('✅ Test document cleaned up');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

testDB();
