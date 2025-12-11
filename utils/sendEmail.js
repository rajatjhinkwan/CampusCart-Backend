// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  try {
    // 1️⃣ Create the transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g., "smtp.gmail.com"
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for port 465, false for 587
      auth: {
        user: process.env.SMTP_USER, // your email ID
        pass: process.env.SMTP_PASS, // your app password (not Gmail login)
      },
    });

    // 2️⃣ Verify connection configuration
    await transporter.verify(); // helps detect invalid SMTP setup early

    // 3️⃣ Define mail options
    const mailOptions = {
      from: `"Support Team" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    };

    // 4️⃣ Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);

  } catch (error) {
    console.error("❌ Detailed Email Error:", error); // print full reason
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
