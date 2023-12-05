import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("DB is connected!".cyan.underline.bold);
  } catch (err) {
    console.log(err.message);
  }
};

export default connectDB;
