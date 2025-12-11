const request = require("supertest");
const app = require("../app");
const { createUser, genAuthToken } = require("./helpers/fixtures");
const User = require("../models/userModel");

describe("User routes", () => {
  let user, token;
  beforeEach(async () => {
    user = await createUser({ email: "u@example.com" });
    token = genAuthToken(user);
  });

  test("GET /api/users/:id -> public profile", async () => {
    const res = await request(app).get(`/api/users/${user._id}`).expect(200);
    expect(res.body).toHaveProperty("email", user.email);
  });

  test("POST /api/users/wishlist -> add product id to wishlist", async () => {
    // assume wishlist uses product id, create fake product id
    const fakeId = "507f191e810c19729de860ea";
    const res = await request(app).post("/api/users/wishlist").set("Authorization", `Bearer ${token}`).send({ productId: fakeId }).expect(200);
    const u = await User.findById(user._id);
    expect(u.wishlist).toContainEqual(expect.anything()); // adjust per schema, or explicitly compare stringified ids
  });
});
