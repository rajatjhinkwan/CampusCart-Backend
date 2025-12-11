// testEmail.js
require("dotenv").config();
const sendEmail = require("./utils/sendEmail");

const subject = "THIS IS THE SUBJECT FOR TEST MAIL"

const body =  "This is the body of a test email"

sendEmail("safifel191@wivstore.com", subject , body)
  .then(() => console.log("✅ Test email sent successfully"))
  .catch((err) => console.error("❌ Test failed:", err.message));
