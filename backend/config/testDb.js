import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

console.log('⏳ Testing MongoDB Atlas Connection...');
console.log('URI:', process.env.MONGO_URI ? process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@') : 'UNDEFINED');

try {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`🎉 [SUCCESS] Connected to MongoDB Atlas! Host: ${conn.connection.host}, DB Name: ${conn.connection.name}`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected cleanly.');
  process.exit(0);
} catch (err) {
  console.error('❌ Connection Failed:', err.message);
  process.exit(1);
}
