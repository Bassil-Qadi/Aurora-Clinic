import mongoose from "mongoose";

const ClinicSchema = new mongoose.Schema({
  name: String,
  address: String,
  phone: String,
  email: String,
  logo: String, // image URL
});

export default mongoose.models.Clinic ||
  mongoose.model("Clinic", ClinicSchema);
