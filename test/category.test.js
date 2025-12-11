const request = require("supertest");
const app = require("../app");
const Category = require("../models/categoryModel");
const { createUser, genAuthToken } = require("./helpers/fixtures");

describe("Category", () => {
  let admin, adminToken;
  beforeEach(async () => {
    admin = await createUser({ email: "admin@example.com", role: "admin" });
    adminToken = genAuthToken(admin);
  });

  test("POST /api/categories (admin) -> create category", async () => {
    const res = await request(app).post("/api/categories").set("Authorization", `Bearer ${adminToken}`).send({ name: "Electronics", slug: "electronics" }).expect(201);
    expect(res.body).toHaveProperty("name", "Electronics");
    const db = await Category.findOne({ name: "Electronics" });
    expect(db).not.toBeNull();
  });

  test("GET /api/categories -> returns categories", async () => {
    await Category.create({ name: "Books", slug: "books" });
    const res = await request(app).get("/api/categories").expect(200);
    expect(res.body.some(c => c.name === "Books")).toBeTruthy();
  });
});
