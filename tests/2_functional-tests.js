'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

chai.use(chaiHttp);
const { assert } = chai;

suite('Functional Tests', function () {
  const board = `testboard-${Date.now()}`;
  let threadId;
  let replyId;

  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/threads/${board}`)
      .type('form')
      .send({ text: 'Functional test thread', delete_password: 'thread-pass' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.include(res.redirects[0], `/b/${board}/`);

        chai
          .request(server)
          .get(`/api/threads/${board}`)
          .end((getErr, getRes) => {
            assert.isArray(getRes.body);
            assert.equal(getRes.body[0].text, 'Functional test thread');
            assert.notProperty(getRes.body[0], 'delete_password');
            assert.notProperty(getRes.body[0], 'reported');
            threadId = getRes.body[0]._id;
            done(getErr || err);
          });
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    const requests = [];

    for (let i = 0; i < 12; i += 1) {
      requests.push(
        chai
          .request(server)
          .post(`/api/threads/${board}`)
          .type('form')
          .send({ text: `Thread ${i}`, delete_password: 'pw' })
      );
    }

    Promise.all(requests)
      .then(() => chai.request(server).get(`/api/threads/${board}`))
      .then((res) => {
        assert.equal(res.status, 200);
        assert.isAtMost(res.body.length, 10);
        assert.notProperty(res.body[0], 'delete_password');
        assert.notProperty(res.body[0], 'reported');
        assert.isAtMost(res.body[0].replies.length, 3);
        done();
      })
      .catch(done);
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/threads/${board}`)
      .type('form')
      .send({ thread_id: threadId, delete_password: 'bad-pass' })
      .end((err, res) => {
        assert.equal(res.text, 'incorrect password');
        done(err);
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/threads/${board}`)
      .type('form')
      .send({ text: 'Thread to delete', delete_password: 'delete-me' })
      .then(() => chai.request(server).get(`/api/threads/${board}`))
      .then((res) => {
        const deletable = res.body.find((thread) => thread.text === 'Thread to delete');
        return chai
          .request(server)
          .delete(`/api/threads/${board}`)
          .type('form')
          .send({ thread_id: deletable._id, delete_password: 'delete-me' });
      })
      .then((res) => {
        assert.equal(res.text, 'success');
        done();
      })
      .catch(done);
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .put(`/api/threads/${board}`)
      .type('form')
      .send({ thread_id: threadId })
      .end((err, res) => {
        assert.equal(res.text, 'reported');
        done(err);
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/replies/${board}`)
      .type('form')
      .send({ thread_id: threadId, text: 'Functional reply', delete_password: 'reply-pass' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.include(res.redirects[0], `/b/${board}/${threadId}`);
        done(err);
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .get(`/api/replies/${board}`)
      .query({ thread_id: threadId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body._id, threadId);
        assert.isAtLeast(res.body.replies.length, 1);
        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body, 'reported');
        assert.notProperty(res.body.replies[0], 'delete_password');
        assert.notProperty(res.body.replies[0], 'reported');
        replyId = res.body.replies[0]._id;
        done(err);
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/replies/${board}`)
      .type('form')
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'bad-pass' })
      .end((err, res) => {
        assert.equal(res.text, 'incorrect password');
        done(err);
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/replies/${board}`)
      .type('form')
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'reply-pass' })
      .then((res) => {
        assert.equal(res.text, 'success');
        return chai.request(server).get(`/api/replies/${board}`).query({ thread_id: threadId });
      })
      .then((res) => {
        const deletedReply = res.body.replies.find((reply) => reply._id === replyId);
        assert.equal(deletedReply.text, '[deleted]');
        done();
      })
      .catch(done);
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/replies/${board}`)
      .type('form')
      .send({ thread_id: threadId, text: 'Reply to report', delete_password: 'report-pass' })
      .then(() => chai.request(server).get(`/api/replies/${board}`).query({ thread_id: threadId }))
      .then((res) => {
        const reportReply = res.body.replies.find((reply) => reply.text === 'Reply to report');
        return chai
          .request(server)
          .put(`/api/replies/${board}`)
          .type('form')
          .send({ thread_id: threadId, reply_id: reportReply._id });
      })
      .then((res) => {
        assert.equal(res.text, 'reported');
        done();
      })
      .catch(done);
  });
});
