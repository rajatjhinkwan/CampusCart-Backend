// unit test that service exposes sendEmail function and returns success (mocked)
const emailService = require("../../services/emailService");

describe("Email service", () => {
  test("sendEmail resolves (mock)", async () => {
    // if your service uses nodemailer, mock nodemailer in separate jest mock file.
    await expect(emailService.sendEmail({ to: "a@b.com", subject: "t", html: "<p>x</p>" })).resolves.toBeTruthy();
  });
});
