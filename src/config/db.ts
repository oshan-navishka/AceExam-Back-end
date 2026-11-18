import mongoose from "mongoose";

// Cache the connection across serverless function invocations
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected, reusing connection.");
    return;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }

    const db = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;