import mongoose from "mongoose";

let Schema = mongoose.Schema;

const hubSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  refCount: {
    type: Number,
  },
  referrals: [
    {
      email: { type: String },
      hasPurchase: { type: Boolean },
    },
  ],
});

export default mongoose.model("Hub", hubSchema);
