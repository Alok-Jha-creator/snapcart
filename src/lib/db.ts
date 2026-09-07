import mongoose from "mongoose";

const mongodbUrl=process.env.MONGODB_URL || "mongodb://localhost:27017/snapcart";

if (!mongodbUrl) {
    throw new Error("Database connection error");
}

