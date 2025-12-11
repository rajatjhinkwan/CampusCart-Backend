const request = require("supertest");
const app = require("../app");
const User = require("../models/userModel");

describe("Auth routes", () => {
  beforeEach(async () => { await User.deleteMany({}); });

  test("POST /api/auth/register -> creates user and returns token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Rajat", email: "rajat@example.com", password: "pass1234" })
      .expect(201);

    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", "rajat@example.com");

    const dbUser = await User.findOne({ email: "rajat@example.com" });
    expect(dbUser).not.toBeNull();
  });

  test("POST /api/auth/login -> returns token for valid credentials", async () => {
    // create user via model (hashing might happen in model pre-save or controller)
    await request(app).post("/api/auth/register").send({ name: "A", email: "a@example.com", password: "pass1234" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "pass1234" })
      .expect(200);

    expect(res.body).toHaveProperty("token");
  });

  test("GET /api/users/me -> protected returns user data", async () => {
    const reg = await request(app).post("/api/auth/register").send({ name: "X", email: "x@example.com", password: "p" });
    const token = reg.body.token;
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body).toHaveProperty("email", "x@example.com");
  });
});
