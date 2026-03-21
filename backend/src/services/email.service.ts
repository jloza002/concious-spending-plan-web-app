import nodemailer from "nodemailer";

/** Creates a transporter using env SMTP config, or Ethereal for local dev */
async function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Local dev: use Ethereal fake SMTP (prints preview URL to console)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

const FROM = process.env.EMAIL_FROM || '"Conscious Spending Plan" <noreply@consciousspending.app>';
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/** Send email verification link after registration */
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const transporter = await getTransporter();
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your Conscious Spending Plan account",
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #15302F; padding: 32px; text-align: right; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Conscious Spending Plan</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
          <h2 style="color: #15302F; margin-top: 0;">Welcome, ${name || "there"}!</h2>
          <p style="color: #525252;">Thanks for signing up. Click the button below to verify your email address and activate your account.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #FB4D30; color: white; padding: 14px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; display: inline-block;">
              Verify My Account
            </a>
          </div>
          <p style="color: #a3a3a3; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <p style="color: #a3a3a3; font-size: 12px;">Or copy this link: <a href="${link}" style="color: #FB4D30;">${link}</a></p>
        </div>
      </div>
    `,
    text: `Welcome to Conscious Spending Plan!\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
  });

  // In dev, log the Ethereal preview URL so you can see the email
  if (!process.env.SMTP_HOST) {
    console.log(`📧 [Dev] Email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

/** Send password reset email */
export async function sendPasswordResetEmail(email: string, token: string) {
  const transporter = await getTransporter();
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Reset your Conscious Spending Plan password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #15302F; padding: 32px; text-align: right; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Conscious Spending Plan</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
          <h2 style="color: #15302F; margin-top: 0;">Reset your password</h2>
          <p style="color: #525252;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #FB4D30; color: white; padding: 14px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #a3a3a3; font-size: 13px;">If you didn't request a reset, ignore this email — your password won't change.</p>
        </div>
      </div>
    `,
    text: `Reset your password: ${link}\n\nExpires in 1 hour.`,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 [Dev] Password reset preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
