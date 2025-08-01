import "dotenv/config";
const { DB_USER, DB_PASS, DB_NAME } = process.env;
import mongoose from "mongoose";

export const connectDB = async () => {
  const dbURI2 = `mongodb+srv://${DB_USER}:${DB_PASS}@sequentialcluster.ysuwruz.mongodb.net/${DB_NAME}`;
  // `mongodb+srv://${DB_USER}:${DB_PASS}@nexiacluster.e8wt9cq.mongodb.net/${DB_NAME}`
  // const dbURI = `mongodb://localhost:27017/${DB_NAME}`; // localhost

  try {
    await mongoose.connect(dbURI2);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log("Error connecting to MongoDB", err);
    throw err;
  }
};
