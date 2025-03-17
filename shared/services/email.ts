import nodemailer from 'nodemailer';
import { config } from '@shared/config';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Email gönderme fonksiyonu
export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}