const request = require("supertest");
const app = require("../app");
const Notification = require("../models/notificationModel");
const { createUser, genAuthToken } = require("./helpers/fixtures");

describe("Notifications", () => {
  let user, token;
  beforeEach(async () => {
    user = await createUser();
    token = genAuthToken(user);
  });

  test("GET /api/notifications -> list", async () => {
    await Notification.create({ user: user._id, title: "Hello", read: false });
    const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/notifications/mark-read -> mark one", async () => {
    const n = await Notification.create({ user: user._id, title: "X", read: false });
    const res = await request(app).post(`/api/notifications/${n._id}/mark-read`).set("Authorization", `Bearer ${token}`).expect(200);
    const updated = await Notification.findById(n._id);
    expect(updated.read).toBe(true);
  });
});
