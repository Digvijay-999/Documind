import mongoose from 'mongoose';
import dns from 'dns';

export const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI is not set in environment variables. MongoDB features will be disabled.');
      return;
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // Don't exit process, we want graceful degradation since PostgreSQL is primary
  }
};
