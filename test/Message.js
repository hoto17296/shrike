const Message = require('../lib/Message');
const assert = require('assert');
const sinon = require('sinon');

describe('Message', () => {
  const bot = {
    data: {
      self: { id: 'TESTBOT' },
      users: [{ id: 'TESTBOT' }, { id: 'USER1' }],
      ims: [{ id: 'IMUSER1', user: 'USER1' }],
    },
    send: function() {},
  };

  function messageGenerator(msg) {
    if ( typeof msg !== 'object' ) msg = { text: msg };
    msg.channel = msg.channel || 'AAAAAA';
    msg.user = msg.user || 'USER1';
    return new Message(bot, msg);
  }

  describe('isMention()', () => {
    it('should not match normal message', () => {
      const msg = messageGenerator('foo');
      assert( ! msg.isMention() );
    });

    it('should match mention message', () => {
      const msg = messageGenerator('foo <@TESTBOT>');
      assert( msg.isMention() );
    });

    it('should match direct mention message', () => {
      const msg = messageGenerator('<@TESTBOT> foo');
      assert( msg.isMention() );
    });
  });

  describe('isDirectMention()', () => {
    it('should not match normal message', () => {
      const msg = messageGenerator('foo');
      assert( ! msg.isDirectMention() );
    });

    it('should not match mention message', () => {
      const msg = messageGenerator('foo <@TESTBOT>');
      assert( ! msg.isDirectMention() );
    });

    it('should match direct mention message', () => {
      const msg = messageGenerator('<@TESTBOT> foo');
      assert( msg.isDirectMention() );
    });
  });

  describe('isDirectMessage()', () => {
    it('should not match normal message', () => {
      const msg = messageGenerator('foo');
      assert( ! msg.isDirectMessage() );
    });

    it('should match direct message', () => {
      const msg = messageGenerator({ text: 'foo', channel: 'IMUSER1' });
      assert( msg.isDirectMessage() );
    });
  });

  describe('send()', () => {
    it('should send message', () => {
      const msg = messageGenerator('foo');
      const mock = sinon.mock(bot);
      mock.expects('send').once().withArgs({ channel: 'AAAAAA', text: 'bar' });
      msg.send('bar');
      assert( mock.verify() );
    });
  });

  describe('reply()', () => {
    it('should send reply message', () => {
      const msg = messageGenerator('foo');
      const mock = sinon.mock(bot);
      mock.expects('send').once().withArgs({ channel: 'AAAAAA', text: '<@USER1> bar' });
      msg.reply('bar');
      assert( mock.verify() );
    });
  });
});
