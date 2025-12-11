const request = require("supertest");
const app = require("../app");
const { createUser, genAuthToken } = require("./helpers/fixtures");

describe("Middleware", () => {
  test("authMiddleware blocks requests without token", async () => {
    await request(app).get("/api/users/me").expect(401); // or 403 depending on implementation
  });

  test("adminMiddleware blocks non-admin", async () => {
    const user = await createUser({ role: "user" });
    const token = genAuthToken(user);
    await request(app).post("/api/categories").set("Authorization", `Bearer ${token}`).send({ name: "X" }).expect(403);
  });
});
