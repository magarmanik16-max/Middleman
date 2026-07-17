import 'dotenv/config';
import nodemailer from 'nodemailer';
import OTP from '../models/OTP.js';
import { logger } from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }

  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'ManikCloud - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Hello,</p>
            <p>Your One-Time Password (OTP) for ManikCloud registration is:</p>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; margin: 0; font-size: 32px;">${otp}</h1>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>ManikCloud Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`OTP sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending OTP:', error);
      return false;
    }
  }

  async generateAndSendOTP(email) {
    try {
      const otpRecord = await OTP.createOTP(email);
      const sent = await this.sendOTP(email, otpRecord.otp);
      
      if (!sent) {
        throw new Error('Failed to send OTP email');
      }
      
      return true;
    } catch (error) {
      logger.error('Error generating and sending OTP:', error);
      throw error;
    }
  }

  async verifyOTP(email, otp) {
    try {
      return await OTP.verifyOTP(email, otp);
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();