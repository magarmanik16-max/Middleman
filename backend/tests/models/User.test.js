import mongoose from 'mongoose';
import User from '../../src/models/User.js';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe('user');
      expect(savedUser.isVerified).toBe(false);
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(userData.password);
    });

    it('should not save user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Email Validation', () => {
    it('should accept @timesglobal.com.np emails', () => {
      expect(User.isAllowedEmail('test@timesglobal.com.np')).toBe(true);
    });

    it('should reject other domain emails', () => {
      expect(User.isAllowedEmail('test@gmail.com')).toBe(false);
      expect(User.isAllowedEmail('test@yahoo.com')).toBe(false);
    });
  });

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const userData = {
        email: 'test@timesglobal.com.np',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });
});