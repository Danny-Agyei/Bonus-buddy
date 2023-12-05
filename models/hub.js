import mongoose from "mongoose";

let Schema = mongoose.Schema;

const hubSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  referrals: [],
});

export default mongoose.model("Hub", hubSchema);
