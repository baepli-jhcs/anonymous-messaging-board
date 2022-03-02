"use strict";
const mongoose = require("mongoose");
const express = require("express");

module.exports = function (app) {
  mongoose.connect(process.env.DB);
  const ReplySchema = new mongoose.Schema({
    text: { type: String, required: true },
    created_on: { type: Date, default: new Date() },
    delete_password: { type: String, required: true },
    reported: { type: Boolean, default: false },
    __v: { type: Number, select: false },
  });
  const ThreadSchema = new mongoose.Schema({
    board: { type: String, required: true, select: false },
    text: { type: String, required: true },
    created_on: { type: Date, default: new Date() },
    bumped_on: { type: Date, default: new Date() },
    reported: { type: Boolean, default: false },
    delete_password: { type: String, required: true },
    replies: { type: [ReplySchema], default: [] },
    __v: { type: Number, select: false },
  });
  ThreadSchema.index({ board: 1, bumped_on: -1 });
  const Thread = mongoose.model("Thread", ThreadSchema);
  app
    .route("/api/threads/:board")
    .post(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let text = req.body.text;
      let delete_password = req.body.delete_password;
      if (!board || !text || !delete_password)
        return res.json({ error: "missing fields" });
      let newThread;
      try {
        newThread = await Thread.create({ board, text, delete_password });
      } catch {
        return res.json({ error: "failed to create thread" });
      }
      return res.json(newThread);
    })
    .get(async (req, res) => {
      let board = req.params.board;
      let threads;
      try {
        threads = await Thread.find({ board }).select({
          delete_password: 0,
          __v: 0,
          reported: 0,
          "replies.delete_password": 0,
          "replies.reported": 0,
        });
      } catch {
        return res.json({ error: "failed to fetch boards" });
      }
      threads = threads.slice(0, 10);
      for (let i = 0; i < threads.length; i++) {
        threads[i].replies = threads[i].replies.slice(0, 3);
      }
      return res.json(threads);
    })
    .delete(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let { thread_id, delete_password } = req.body;
      if (!thread_id || !delete_password)
        return res.json({ error: "missing fields" });
      let thread;
      try {
        thread = await Thread.findOne({ id: thread_id, board });
        if (!thread) return res.json({ error: "no thread found" });
      } catch {
        return res.json({ error: "failed to fetch thread" });
      }
      if (thread.delete_password != delete_password)
        return res.send("incorrect password");
      try {
        await Thread.findByIdAndDelete(thread_id);
      } catch {
        return res.json({ error: "failed to delete thread" });
      }
      return res.send("success");
    })
    .put(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let _id = req.body.thread_id;
      try {
        await Thread.updateOne({ _id, board }, { reported: true });
      } catch {
        return res.json({ error: "failed to fetch thread" });
      }
      return res.send("reported");
    });

  app
    .route("/api/replies/:board")
    .post(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let { text, delete_password, thread_id } = req.body;
      if (!text || !delete_password || !thread_id)
        return res.json({ error: "missing fields" });
      let thread;
      try {
        thread = await Thread.findOne({ id: thread_id, board });
        if (!thread) return res.json({ error: "no thread found" });
      } catch {
        return res.json({ error: "failed to fetch thread" });
      }
      thread.replies.unshift({ text, delete_password });
      try {
        thread = await thread.save();
      } catch {
        return res.json({ errror: "failed to save reply" });
      }
      thread.bumped_on = thread.replies[0].created_on;
      try {
        thread = await thread.save();
      } catch {
        return res.json({ errror: "failed to save reply" });
      }
      return res.json(thread);
    })
    .get(async (req, res) => {
      let board = req.params.board;
      if (!req.query.thread_id) return res.json({ error: "no thread given" });
      let thread;
      try {
        thread = await Thread.findOne({
          _id: req.query.thread_id,
          board,
        }).select({
          delete_password: 0,
          __v: 0,
          reported: 0,
          "replies.delete_password": 0,
          "replies.reported": 0,
        });
        if (!thread) return res.json({ error: "no thread found" });
      } catch {
        return res.json({ error: "failed to fetch replies" });
      }
      return res.json(thread);
    })
    .delete(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let { thread_id, reply_id, delete_password } = req.body;
      if (!thread_id || !reply_id || !delete_password)
        return res.json({ error: "missing fields" });
      let thread;
      try {
        thread = await Thread.findOne({
          id: thread_id,
          board,
          "replies._id": reply_id,
        });
        if (!thread) return res.json({ error: "no thread found" });
        thread = await Thread.findOne({
          id: thread_id,
          board,
          "replies._id": reply_id,
          "replies.delete_password": delete_password,
        });
        if (!thread) return res.send("incorrect password");
      } catch {
        return res.json({ error: "failed to fetch replies" });
      }
      try {
        await Thread.updateOne(
          { _id: thread_id, "replies._id": reply_id },
          {
            $set: {
              "replies.$.text": "[deleted]",
            },
          }
        );
      } catch {
        return res.json({ error: "failed to delete reply" });
      }
      return res.send("success");
    })
    .put(express.urlencoded({ extended: false }), async (req, res) => {
      let board = req.params.board;
      let { thread_id, reply_id } = req.body;
      try {
        await Thread.updateOne(
          { _id: thread_id, "replies._id": reply_id },
          {
            $set: {
              "replies.$.reported": true,
            },
          }
        );
      } catch {
        return res.json({ error: "failed to fetch thread" });
      }
      return res.send("reported");
    });
};
