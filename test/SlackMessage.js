const SlackMessage = require('../lib/SlackMessage');
const assert = require('assert');
const sinon = require('sinon');

describe('SlackMessage', () => {
  const bot = {
    data: { self: { id: 'TESTBOT' } },
    send: function() {},
  };

  function messageGenerator(msg) {
    if ( typeof msg !== 'object' ) msg = { text: msg };
    msg.channel = msg.channel || 'AAAAAA';
    msg.user = msg.user || 'USER1';
    return new SlackMessage(bot, msg);
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
    // TODO
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
