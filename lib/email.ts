import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
 
export async function sendVerificationEmail(
  to: string, 
  token: string, 
  name: string, 
  userType: 'student' | 'admin' = 'admin'  // Add this parameter
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  // Add type parameter to the URL
  const verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}&type=${userType}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0070f3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #0070f3;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Welcome to University Selection Platform, ${name}!</h2>
        </div>
        <div class="content">
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p><small>${verificationLink}</small></p>
          <p><strong>Note:</strong> This link will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 University Selection Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"University Platform" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Verify Your Email Address',
    html,
  });
}