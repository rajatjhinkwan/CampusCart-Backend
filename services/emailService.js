// services/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

/**
 * EmailService
 * - Uses Nodemailer
 * - Supports simple templating using placeholders like {{name}}
 * - Retry mechanism (simple, limited retries)
 */

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURE, // "true" or "false"
  EMAIL_USER,
  EMAIL_PASS,
  FROM_EMAIL,
} = process.env;

if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
  // don't crash at import time; warnings are enough
  console.warn('[emailService] Missing email configuration in .env');
}

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT ? Number(EMAIL_PORT) : 587,
  secure: EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/** Basic template renderer */
async function loadTemplate(templateName, variables = {}) {
  const tplPath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
  try {
    let content = await fs.readFile(tplPath, 'utf8');
    Object.keys(variables).forEach((k) => {
      content = content.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), variables[k]);
    });
    return content;
  } catch (err) {
    // fallback to raw string if template missing
    return Object.values(variables).join(' ') || '';
  }
}

async function sendMail({ to, subject, html, text, from = FROM_EMAIL, template, vars = {} }, opts = {}) {
  const maxRetries = opts.retries ?? 2;
  let attempt = 0;
  let lastErr;

  if (template) {
    html = html || (await loadTemplate(template, vars));
  }

  const mailOptions = { from, to, subject, html, text };

  while (attempt <= maxRetries) {
    try {
      attempt++;
      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (err) {
      lastErr = err;
      console.error(`[emailService] sendMail attempt ${attempt} error:`, err.message || err);
      // simple backoff
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  return { success: false, error: lastErr };
}

// ============================================
// DSA INTEGRATION: Email Queue Worker
// ============================================
// This ensures the main thread isn't blocked by email sending.
// It makes the user experience "faster" as they don't wait for SMTP.
const { emailQueue } = require('../utils/dsaManager');

// Background worker to process emails from the Queue
setInterval(async () => {
  if (emailQueue && !emailQueue.isEmpty()) {
    const task = emailQueue.dequeue();
    try {
      console.log(`[EmailQueue] Processing background email to: ${task.to}`);
      // reusing sendMail but waiting for it here in the background
      await sendMail(task.mailOptions, task.opts);
    } catch (err) {
      console.error('[EmailQueue] Failed to process email:', err);
    }
  }
}, 2000); // Check every 2 seconds

/**
 * Queues an email to be sent in the background.
 * Returns immediately so the API is fast.
 */
function queueMail(mailOptions, opts = {}) {
  emailQueue.enqueue({ mailOptions, opts });
  return { success: true, message: 'Email queued for background delivery' };
}

module.exports = {
  sendMail,
  queueMail,
  loadTemplate,
  transporter, // export for tests/advanced use
};
