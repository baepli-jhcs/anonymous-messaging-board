const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  let thread_id = "";
  let reply_id = "";
  suite("POST requests", () => {
    test("/api/threads/testboard", async () => {
      let res = await chai
        .request(server)
        .post("/api/threads/testboard")
        .send({ text: "chai test text", delete_password: "delete password" });
      assert.equal(res.status, 200);
      assert.isOk(res.body._id);
      thread_id = res.body._id;
      assert.equal(res.body.text, "chai test text");
      assert.isOk(res.body.created_on);
      assert.equal(res.body.bumped_on, res.body.created_on);
      assert.isFalse(res.body.reported);
      assert.equal(res.body.delete_password, "delete password");
      assert.isArray(res.body.replies);
    });
    test("/api/replies/testboard", async () => {
      let res = await chai.request(server).post("/api/replies/testboard").send({
        text: "chai reply test",
        delete_password: "delete password",
        thread_id,
      });
      assert.equal(res.status, 200);
      assert.isOk(res.body._id);
      assert.equal(res.body.text, "chai test text");
      assert.isOk(res.body.created_on);
      assert.isOk(res.body.bumped_on);
      assert.notEqual(res.body.bumped_on, res.body.created_on);
      assert.isFalse(res.body.reported);
      assert.equal(res.body.delete_password, "delete password");
      assert.isOk(res.body.replies[0]._id);
      reply_id = res.body.replies[0]._id;
      assert.equal(res.body.replies[0].text, "chai reply test");
      assert.equal(res.body.replies[0].delete_password, "delete password");
    });
  });
  suite("GET Requests", () => {
    test("/api/threads/testboard", async () => {
      let res = await chai.request(server).get("/api/threads/testboard");
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      res.body.forEach((post) => {
        assert.isOk(post._id);
        assert.isOk(post.text);
        assert.isOk(post.created_on);
        assert.isOk(post.bumped_on);
        assert.isNotOk(post.reported);
        assert.isNotOk(post.delete_password);
        assert.isTrue(post.replies.length <= 3);
      });
    });
    test(`/api/replies/testboard?thread_id=${thread_id}`, async () => {
      let res = await chai
        .request(server)
        .get(`/api/replies/testboard?thread_id=${thread_id}`);
      assert.equal(res.status, 200);
      assert.isOk(res.body._id);
      assert.equal(res.body.text, "chai test text");
      assert.isOk(res.body.created_on);
      assert.isOk(res.body.bumped_on);
      assert.notEqual(res.body.bumped_on, res.body.created_on);
      assert.isNotOk(res.body.reported);
      assert.isNotOk(res.body.delete_password);
      assert.isOk(res.body.replies[0]._id);
      assert.equal(res.body.replies[0].text, "chai reply test");
      assert.isNotOk(res.body.replies[0].delete_password);
    });
  });
  suite("PUT requests", () => {
    test("/api/threads/testboard", async () => {
      let res = await chai
        .request(server)
        .put("/api/threads/testboard")
        .send({ thread_id });
      assert.equal(res.status, 200);
      assert.equal(res.text, "reported");
    });
    test("/api/replies/testboard", async () => {
      let res = await chai
        .request(server)
        .put("/api/replies/testboard")
        .send({ thread_id, reply_id });
      assert.equal(res.status, 200);
      assert.equal(res.text, "reported");
    });
  });
  suite("DELETE requests", () => {
    test("/api/replies/testboard, invalid", async () => {
      let res = await chai
        .request(server)
        .delete("/api/replies/testboard")
        .send({ thread_id, reply_id, delete_password: "invalid" });
      assert.equal(res.status, 200);
      assert.equal(res.text, "incorrect password");
    });
    test("/api/replies/testboard", async () => {
      let res = await chai
        .request(server)
        .delete("/api/replies/testboard")
        .send({ thread_id, reply_id, delete_password: "delete password" });
      assert.equal(res.status, 200);
      assert.equal(res.text, "success");
    });
    test("/api/threads/testboard, invalid", async () => {
      let res = await chai
        .request(server)
        .delete("/api/threads/testboard")
        .send({ thread_id, delete_password: "invalid" });
      assert.equal(res.status, 200);
      assert.equal(res.text, "incorrect password");
    });
    test("/api/threads/testboard", async () => {
      let res = await chai
        .request(server)
        .delete("/api/threads/testboard")
        .send({ thread_id, delete_password: "delete password" });
      assert.equal(res.status, 200);
      assert.equal(res.text, "success");
    });
  });
});
