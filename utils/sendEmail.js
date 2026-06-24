// utils/sendEmail.js
const nodemailer = require("nodemailer");

/**
 * Beautiful HTML email template generator.
 */
const getHtmlTemplate = (title, contentText, buttonText, buttonUrl, isOtp = false) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 48px 20px;
      box-sizing: border-box;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(2, 6, 23, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header-accent {
      height: 6px;
      background: linear-gradient(90deg, #2563eb 0%, #7c3aed 100%);
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .logo span {
      color: #2563eb;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      color: #475569;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .otp-code {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #2563eb;
      background-color: #eff6ff;
      padding: 16px 24px;
      border-radius: 12px;
      display: inline-block;
      margin: 12px 0 28px 0;
      border: 1px solid #bfdbfe;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px;
      margin-top: 12px;
      margin-bottom: 28px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .footer {
      text-align: center;
      padding: 24px 40px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }
    .footer p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header-accent"></div>
      <div class="content">
        <div class="logo">Campus<span>Cart</span></div>
        <h1>${title}</h1>
        <p>${contentText}</p>
        ${isOtp 
          ? `<div class="otp-code">${buttonText}</div>`
          : buttonUrl 
            ? `<a href="${buttonUrl}" target="_blank" class="btn">${buttonText}</a>`
            : ''
        }
      </div>
      <div class="footer">
        <p>If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

const sendEmail = async (to, subject, text) => {
  try {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true' || false;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (!host || !user || !pass) {
      throw new Error("Email service is not configured");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.verify();

    let htmlContent = '';
    const isVerification = /verify|code|otp/i.test(subject);
    const isReset = /reset|password/i.test(subject);

    if (isVerification) {
      const otpMatch = (text || '').match(/\b\d{6}\b/);
      const otp = otpMatch ? otpMatch[0] : '000000';
      const desc = `Thank you for signing up for CampusCart. Please use the verification code below to confirm your email address and activate your account. This code will expire in 10 minutes.`;
      htmlContent = getHtmlTemplate("Confirm Your Email", desc, otp, null, true);
    } else if (isReset) {
      const urlMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[0] : '#';
      const desc = `We received a request to reset your password. Click the button below to set a new password. This link is valid for 10 minutes.`;
      htmlContent = getHtmlTemplate("Reset Your Password", desc, "Reset Password", url, false);
    } else {
      htmlContent = getHtmlTemplate(subject, text, null, null, false);
    }

    const mailOptions = {
      from: `"CampusCart Team" <${user || process.env.FROM_EMAIL || 'support@yourdomain.com'}>`,
      to,
      subject,
      text,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ HTML Email sent successfully:", info.response);

  } catch (error) {
    console.error("❌ Detailed Email Error:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
