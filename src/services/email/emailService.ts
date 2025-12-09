import nodemailer from 'nodemailer';
import { renderTemplate } from '@/utils/emailTemplates';
import { convert } from 'html-to-text';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    template: string;
    data: any;
    attachments?: any[];
  }) {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('❌ SMTP credentials not configured');
        return { success: false, error: 'SMTP not configured' };
      }

      const html = await renderTemplate(options.template, options.data);
      const text = this.convertHtmlToText(html);

      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'Academic Compass'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: recipients,
        subject: options.subject,
        html: html,
        text: text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP verification failed:', error);
      return false;
    }
  }

  private convertHtmlToText(html: string): string {
    return convert(html, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } },
        { selector: 'img', format: 'skip' },
      ],
    });
  }
}

export const emailService = new EmailService();
