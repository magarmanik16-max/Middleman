import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { register, login, verifyEmail } from '../../src/controllers/authController.js';
import User from '../../src/models/User.js';
import OTP from '../../src/models/OTP.js';

const app = express();
app.use(express.json());

// Mock routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/verify-email', verifyEmail);

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid email', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toContain('registered successfully');
      expect(response.body.userId).toBeDefined();
    });

    it('should reject registration with non-corporate email', async () => {
      const userData = {
        email: 'test@gmail.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('Only @timesglobal.com.np');
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create and verify user first
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Verify user
      const user = await User.findOne({ email: userData.email });
      user.isVerified = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should reject login with invalid credentials', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid OTP', async () => {
      const email = 'test@timesglobal.com.np';
      
      // Create user
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123' });

      // Create OTP
      const otpRecord = await OTP.createOTP(email);
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email, otp: otpRecord.otp })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.isVerified).toBe(true);
    });

    it('should reject verification with invalid OTP', async () => {
      const email = 'test@timesglobal.com.np';
      
      // Create user
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123' });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ email, otp: '000000' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired OTP');
    });
  });
});