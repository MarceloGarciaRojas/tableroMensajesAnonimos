'use strict';

const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const boards = new Map();

function makeId() {
  return crypto.randomBytes(12).toString('hex');
}

function now() {
  return new Date();
}

function getBoard(name) {
  if (!boards.has(name)) {
    boards.set(name, []);
  }

  return boards.get(name);
}

function publicReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on
  };
}

function publicThread(thread, replyLimit) {
  const replies = thread.replies
    .slice()
    .sort((a, b) => b.created_on - a.created_on)
    .slice(0, replyLimit)
    .map(publicReply);

  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies,
    replycount: thread.replies.length
  };
}

function publicFullThread(thread) {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: thread.replies.map(publicReply)
  };
}

function findThread(boardName, threadId) {
  return getBoard(boardName).find((thread) => thread._id === threadId);
}

router
  .route('/threads/:board')
  .post((req, res) => {
    const { text, delete_password } = req.body;

    if (!text || !delete_password) {
      return res.status(400).type('text').send('missing required fields');
    }

    const createdOn = now();
    const thread = {
      _id: makeId(),
      board: req.params.board,
      text,
      created_on: createdOn,
      bumped_on: createdOn,
      reported: false,
      delete_password,
      replies: []
    };

    getBoard(req.params.board).push(thread);
    return res.redirect(`/b/${req.params.board}/${thread._id}`);
  })
  .get((req, res) => {
    const threads = getBoard(req.params.board)
      .slice()
      .sort((a, b) => b.bumped_on - a.bumped_on)
      .slice(0, 10)
      .map((thread) => publicThread(thread, 3));

    return res.json(threads);
  })
  .delete((req, res) => {
    const { thread_id, delete_password } = req.body;
    const board = getBoard(req.params.board);
    const index = board.findIndex((thread) => thread._id === thread_id);

    if (index === -1 || board[index].delete_password !== delete_password) {
      return res.type('text').send('incorrect password');
    }

    board.splice(index, 1);
    return res.type('text').send('success');
  })
  .put((req, res) => {
    const { thread_id } = req.body;
    const thread = findThread(req.params.board, thread_id);

    if (thread) {
      thread.reported = true;
    }

    return res.type('text').send('reported');
  });

router
  .route('/replies/:board')
  .post((req, res) => {
    const { thread_id, text, delete_password } = req.body;
    const thread = findThread(req.params.board, thread_id);

    if (!thread || !text || !delete_password) {
      return res.status(400).type('text').send('missing required fields');
    }

    const createdOn = now();
    thread.replies.push({
      _id: makeId(),
      text,
      created_on: createdOn,
      delete_password,
      reported: false
    });
    thread.bumped_on = createdOn;

    return res.redirect(`/b/${req.params.board}/${thread._id}`);
  })
  .get((req, res) => {
    const thread = findThread(req.params.board, req.query.thread_id);

    if (!thread) {
      return res.status(404).type('text').send('thread not found');
    }

    return res.json(publicFullThread(thread));
  })
  .delete((req, res) => {
    const { thread_id, reply_id, delete_password } = req.body;
    const thread = findThread(req.params.board, thread_id);
    const reply = thread && thread.replies.find((item) => item._id === reply_id);

    if (!reply || reply.delete_password !== delete_password) {
      return res.type('text').send('incorrect password');
    }

    reply.text = '[deleted]';
    return res.type('text').send('success');
  })
  .put((req, res) => {
    const { thread_id, reply_id } = req.body;
    const thread = findThread(req.params.board, thread_id);
    const reply = thread && thread.replies.find((item) => item._id === reply_id);

    if (reply) {
      reply.reported = true;
    }

    return res.type('text').send('reported');
  });

module.exports = router;
