import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  html?: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const password = process.env.SMTP_PASSWORD;

      if (!host || !user || !password) {
        console.warn('⚠️ SMTP configuration missing. Emails will be logged only.');
        // Return a stub transporter that logs instead of sending
        return {
          sendMail: async (options: Record<string, unknown>) => {
            console.log('📧 [DEV] Email would be sent:', {
              to: options.to,
              subject: options.subject,
            });
            return { messageId: `dev-${Date.now()}` };
          },
          verify: async () => {
            console.log('📧 [DEV] SMTP verify (stub)');
            return true;
          },
        } as unknown as nodemailer.Transporter;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
        tls: { rejectUnauthorized: false },
      });
    }
    return this.transporter;
  }

  /**
   * Build HTML from template name and data.
   * For now, generates a simple fallback HTML. Add real templates as needed.
   */
  private buildHtml(template: string, data: Record<string, unknown>): string {
    const entries = Object.entries(data)
      .map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:bold;">${k}</td><td style="padding:4px 8px;">${v}</td></tr>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#4D869C;color:white;padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:22px;">Academic Compass</h1>
          <p style="margin:4px 0 0;opacity:0.8;font-size:13px;">Template: ${template}</p>
        </div>
        <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;">${entries}</table>
        </div>
        <p style="font-size:11px;color:#999;text-align:center;margin-top:16px;">
          This is an automated message from Academic Compass. Please do not reply.
        </p>
      </body>
      </html>
    `;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const transporter = this.getTransporter();
      const fromName = process.env.SMTP_FROM_NAME || 'Academic Compass';
      const fromEmail = process.env.SMTP_USER || 'noreply@academiccompass.app';

      const html = options.html || this.buildHtml(options.template, options.data);
      const text =
        options.text ||
        Object.entries(options.data)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html,
        text,
      });

      console.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Email send failed to ${options.to}:`, message);
      return { success: false, error: message };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await (transporter as nodemailer.Transporter).verify();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ SMTP verification failed:', message);
      return false;
    }
  }
}

export const emailService = new EmailService();
