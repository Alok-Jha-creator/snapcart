import mongoose from "mongoose";

const mongodbUrl=process.env.MONGODB_URL || "mongodb://localhost:27017/snapcart";

if (!mongodbUrl) {
    throw new Error("Database connection error");
}

let cached = global.mongoose;
if (!cached) {
    cached=global.mongoose = { conn: null, promise: null };
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
       cached.promise = mongoose.connect(mongodbUrl).then((conn)=>conn.connection);
       
    }

    try {
        const conn = await cached.promise
        return conn;
    } catch (error) {
        console.log("Database connection error", error);
    }
}


export default connectDb;