const request = require("supertest");
const app = require("../app");
const { createUser, genAuthToken } = require("./helpers/fixtures");
const Message = require("../models/messageModel");
const Conversation = require("../models/conversationModel");

describe("Messaging", () => {
  let alice, bob, tokenA, tokenB;
  beforeEach(async () => {
    alice = await createUser({ email: "alice@example.com" });
    bob = await createUser({ email: "bob@example.com" });
    tokenA = genAuthToken(alice);
    tokenB = genAuthToken(bob);
  });

  test("POST /api/messages -> send message creates conversation & message", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ to: bob._id, text: "Hi Bob" })
      .expect(201);

    expect(res.body).toHaveProperty("message");
    const conv = await Conversation.findOne({ participants: { $all: [alice._id, bob._id] } });
    expect(conv).not.toBeNull();
    const msg = await Message.findOne({ text: "Hi Bob" });
    expect(msg).not.toBeNull();
    expect(msg.sender.toString()).toBe(alice._id.toString());
  });

  test("GET /api/conversations -> list for user", async () => {
    // create one conversation
    const conv = await Conversation.create({ participants: [alice._id, bob._id] });
    const res = await request(app).get("/api/conversations").set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(c => c._id === conv._id.toString())).toBeTruthy();
  });
});
