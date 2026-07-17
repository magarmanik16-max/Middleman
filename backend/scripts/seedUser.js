import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const seed = async () => {
  const email = 'manik.magar@timesglobal.com.np';
  const password = '736288';
  const role = process.env.SEED_ROLE || 'admin';

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email });
  if (existing) {
    existing.password = password;
    existing.role = role;
    existing.isVerified = true;
    await existing.save();
    console.log(`Updated existing user: ${email} (role=${role}, verified=true)`);
  } else {
    await User.create({ email, password, role, isVerified: true });
    console.log(`Created user: ${email} (role=${role}, verified=true)`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});