const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");

test("generateToken returns jwt token that decodes to payload", () => {
  const token = generateToken({ id: "abc", email: "a@b" });
  const payload = jwt.verify(token, process.env.JWT_SECRET || "testsecret");
  expect(payload).toHaveProperty("id", "abc");
});
