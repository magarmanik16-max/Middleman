import mongoose from 'mongoose';
import { randomInt } from 'crypto';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries and automatic cleanup
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate OTP using cryptographically secure random
// (Avoids Math.random() which is predictable)
otpSchema.statics.generateOTP = function() {
  return randomInt(100000, 1000000).toString();
};

// Static method to create OTP
otpSchema.statics.createOTP = async function(email) {
  // Delete any existing OTPs for this email
  await this.deleteMany({ email });
  
  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return await this.create({
    email,
    otp,
    expiresAt
  });
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp) {
  const otpRecord = await this.findOne({
    email,
    otp,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!otpRecord) {
    return false;
  }
  
  // Mark OTP as used
  otpRecord.used = true;
  await otpRecord.save();
  
  return true;
};

export default mongoose.model('OTP', otpSchema);