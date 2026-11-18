import "dotenv/config";
import connectDB from "../src/config/db";
import app from "../src/app";

// Connect to MongoDB before handling requests
connectDB();

export default app;
