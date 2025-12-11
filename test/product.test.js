const request = require("supertest");
const app = require("../app");
const Product = require("../models/productModel");
const { createUser, genAuthToken } = require("./helpers/fixtures");

describe("Product routes", () => {
  let token, user;
  beforeEach(async () => {
    await Product.deleteMany({});
    user = await createUser({ email: "seller@example.com" });
    token = genAuthToken(user);
  });

  test("POST /api/products -> create product (auth)", async () => {
    const payload = { title: "Laptop", description: "Good", price: 1000, category: "electronics" };
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(res.body).toHaveProperty("title", "Laptop");
    const db = await Product.findOne({ title: "Laptop" });
    expect(db).not.toBeNull();
    expect(db.owner.toString()).toBe(user._id.toString());
  });

  test("GET /api/products -> list products (public)", async () => {
    await Product.create({ title: "Item1", price: 10 });
    const res = await request(app).get("/api/products").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("PUT /api/products/:id -> update (owner only)", async () => {
    const product = await Product.create({ title: "Old", price: 10, owner: user._id });
    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 20 })
      .expect(200);
    expect(res.body.price).toBe(20);
  });

  test("DELETE /api/products/:id -> owner can delete", async () => {
    const product = await Product.create({ title: "ToDel", owner: user._id });
    await request(app).delete(`/api/products/${product._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    const found = await Product.findById(product._id);
    expect(found).toBeNull();
  });
});
