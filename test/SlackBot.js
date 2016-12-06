const SlackBot = require('../lib/SlackBot');
const Slack = require('@slack/client');
const EventEmitter = require('events');
const assert = require('assert');
const sinon = require('sinon');

Slack.RtmClient = class extends EventEmitter {
  constructor() {
    super();
  }
  start() {
    var data = {
      self: { id: 'TESTBOT' },
      users: [{ id: 'TESTBOT' }, { id: 'USER1' }],
      channels: [
        {
          id: 'AAAAAA',
          name: 'dummy_general',
          is_general: true,
        },
        {
          id: 'BBBBBB',
          name: 'other_channel',
          is_general: false,
        },
      ],
      ims: [{ id: 'IMUSER1', user: 'USER1' }],
    };
    process.nextTick(() => {
      this.emit(Slack.CLIENT_EVENTS.RTM.AUTHENTICATED, data);
      process.nextTick(() => {
        this.emit(Slack.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED);
      });
    });
  }
  send() {}
}

describe('SlackBot', () => {
  var bot;
  var mock;

  function simulateMessageEvent(msg) {
    if ( typeof msg !== 'object' ) msg = { text: msg };
    bot._client.rtm.emit(Slack.RTM_EVENTS.MESSAGE, msg);
  }

  beforeEach(() => {
    bot = new SlackBot();
    bot.start();
    mock = sinon.mock( Slack.RtmClient.prototype );
  });

  afterEach(() => {
    mock.restore();
  });

  context('setup', () => {
    it('should start connection', (done) => {
      bot = new SlackBot();
      bot.start().then(() => {
        assert(true);
        done();
      });
    });
  });

  describe('send()', () => {
    it('should send text message', () => {
      mock.expects('send').once().withArgs({ channel: 'AAAAAA', text: 'foo', type: Slack.RTM_EVENTS.MESSAGE });
      bot.send('foo');
      assert( mock.verify() );
    });

    it('should send attachments', () => {
      mock.expects('send').never();
      const mockWeb = sinon.mock( bot._client.web.chat );
      const expectMsg = { as_user: true, attachments: [], channel: 'AAAAAA', type: Slack.RTM_EVENTS.MESSAGE };
      mockWeb.expects('postMessage').once().withArgs('AAAAAA', undefined, expectMsg);
      bot.send({ attachments: [] });
      assert( mock.verify() );
      assert( mockWeb.verify() );
    });

    context('channel name specified', () => {
      context('specified channel exists', () => {
        it('should send to specified channel', () => {
          mock.expects('send').once().withArgs({ channel: 'BBBBBB', text: 'foo', type: Slack.RTM_EVENTS.MESSAGE });
          bot.send('foo', 'other_channel');
          assert( mock.verify() );
        });
      });

      context('specified channel does not exists', () => {
        it('should reject method call', (done) => {
          bot.send('foo', 'not_exist_channel').catch((err) => {
            assert.equal(err, 'Channel "not_exist_channel" not found.');
            done();
          });
        });
      });
    });

    context('channel id specified', () => {
      it('should send to specified channel', () => {
        mock.expects('send').once().withArgs({ channel: 'BBBBBB', text: 'foo', type: Slack.RTM_EVENTS.MESSAGE });
        bot.send({ text: 'foo', channel: 'BBBBBB' });
        assert( mock.verify() );
      });
    });
  });

  describe('hear()', () => {
    it('should listen all messages', (done) => {
      bot.hear(/foo/, () => {
        assert(true);
        done();
      });
      bot.hear(/bar/, () => assert(false));
      simulateMessageEvent('foo');
    });
  });

  describe('respond()', () => {
    it('should listen mentions', (done) => {
      bot.respond(/foo/, () => {
        assert(true);
        done();
      });
      simulateMessageEvent('foo');
      simulateMessageEvent('<@TESTBOT> foo');
    });
  });
});
