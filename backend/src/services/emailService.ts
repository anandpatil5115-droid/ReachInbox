import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

let transporter: nodemailer.Transporter | null = null;

export function createTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: env.ETHEREAL_SECURE,
    auth: {
      user: env.ETHEREAL_USER,
      pass: env.ETHEREAL_PASSWORD,
    },
  });

  return transporter;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const transport = createTransporter();

  const mailOptions = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };

  const info = await transport.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}

export async function verifyTransporter(): Promise<boolean> {
  try {
    const transport = createTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    console.error('Email transporter verification failed:', error);
    return false;
  }
}
