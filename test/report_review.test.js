const request = require("supertest");
const app = require("../app");
const { createUser, genAuthToken } = require("./helpers/fixtures");
const Report = require("../models/reportModel");
const Review = require("../models/reviewModel");

describe("Reports & Reviews", () => {
  let user, token;
  beforeEach(async () => {
    user = await createUser();
    token = genAuthToken(user);
  });

  test("POST /api/reviews -> create review", async () => {
    const res = await request(app).post("/api/reviews").set("Authorization", `Bearer ${token}`).send({ productId: "507f191e810c19729de860ea", rating: 4, comment: "Nice" }).expect(201);
    expect(res.body).toHaveProperty("rating", 4);
  });

  test("POST /api/reports -> create report", async () => {
    const res = await request(app).post("/api/reports").set("Authorization", `Bearer ${token}`).send({ productId: "507f191e810c19729de860ea", reason: "spam" }).expect(201);
    const db = await Report.findOne({ reason: "spam" });
    expect(db).not.toBeNull();
  });
});
