const Slack = require('@slack/client');
const Message = require('./Message');
const Pattern = require('./Pattern');
const EventEmitter = require('events');
const fs = require('fs');

const EVENTS = {
  AUTHENTICATED: Symbol(),
  CONNECTION: {
    OPENED: Symbol(),
  },
  MESSAGE: {
    RECEIVED: Symbol(),
  },
};

class Bot extends EventEmitter {
  constructor(token, opts = {}) {
    super();
    const debug = opts.debug !== undefined ? opts.debug : process.env.NODE_ENV !== 'production';
    const logLevel = debug ? 'debug' : 'error';
    this._client = {
      rtm: new Slack.RtmClient(token, { logLevel, useRtmConnect: true }),
      web: new Slack.WebClient(token, { logLevel }),
    };
    this.logger = opts.logger || console;
    this.helps = [];
    this._client.rtm.on(Slack.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => this.emit(EVENTS.CONNECTION.OPENED));
    this._client.rtm.on(Slack.RTM_EVENTS.MESSAGE, this._onReceive.bind(this));
    this.setMaxListeners(Infinity);
  }

  _onReceive(message) {
    if ( ! message.text ) return;
    var p = Promise.resolve( new Message(this, message) );
    this.listeners(EVENTS.MESSAGE.RECEIVED).forEach((cb) => {
      p = p.then((msg) => new Promise((next, error) => cb(msg, next, error)));
    });
    p.then((msg) => {
      if ( msg.isDirectMention() || msg.isDirectMessage() ) {
        this.emit('respond', msg);
      }
      this.emit('hear', msg);
    });
    p.catch((e) => this.logger.error(e));
  }

  start() {
    const initialize = new Promise((resolve, reject) => {
      this._client.rtm.once(Slack.CLIENT_EVENTS.RTM.AUTHENTICATED, resolve);
      this._client.rtm.once(Slack.CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, reject);
    })
    .then((data) => {
      this.data = data;
      return Promise.all([
        this._client.web.channels.list(),
        this._client.web.users.list(),
        this._client.web.im.list(),
      ]);
    })
    .then((res) => {
      this.data.channels = res[0].channels;
      this.data.users = res[1].members;
      this.data.ims = res[2].ims;
      this.default_channel = opts.default_channel
        ? this.data.channels.filter((c) => c.name === opts.default_channel)[0]
        : this.data.channels.filter((c) => c.is_general)[0];
      this.emit(EVENTS.AUTHENTICATED, data);
      this.respond(/help$/i, this.showHelp.bind(this));
      return Promise.resolve();
    });

    const createConnection = new Promise((resolve, reject) => {
      this.once(EVENTS.CONNECTION.OPENED, resolve);
      setTimeout(reject, 10000); // 10s
    });

    this._client.rtm.start();
    return Promise.all([initialize, createConnection]);
  }

  send(msg, channel_name) {
    return new Promise((resolve, reject) => {
      if ( typeof msg !== 'object' ) msg = { text: msg };

      msg.channel = msg.channel || this.default_channel.id;

      if ( channel_name ) {
        let channel = this.data.channels.filter((channel) => channel.name === channel_name)[0];
        if ( ! channel ) return reject('Channel "' + channel_name + '" not found.');
        msg.channel = channel.id;
      }

      msg.type = msg.type || Slack.RTM_EVENTS.MESSAGE;
      msg.attachments ? this._sendWeb(msg, resolve) : this._client.rtm.send(msg, resolve);
    });
  }

  _sendWeb(msg, cb) {
    if (!('as_user' in msg)) {
      msg.as_user = true;
    }
    this._client.web.chat.postMessage(msg.channel, undefined, msg, cb);
  }

  hear(pattern, cb) {
    this._register('hear', pattern, cb);
  }

  respond(pattern, cb) {
    this._register('respond', pattern, cb);
  }

  _register(eventName, pattern, cb) {
    if ( typeof cb !== 'function' ) throw new TypeError();
    pattern = new Pattern(pattern);
    this.on(eventName, (msg) => {
      if ( msg.match = pattern.match(msg) ) cb(msg);
    });
  }

  load(module) {
    if ( typeof module !== 'string' ) throw TypeError();
    if ( module.match(/^\./) ) module = `${process.cwd()}/${module}`;
    const script = require(module);
    if ( typeof script !== 'function' ) throw TypeError();
    if ( script.help ) this.helps.push( script.help );
    script(this);
  }

  loadDir(dir) {
    dir = `${process.cwd()}/${dir}`;
    const files = fs.readdirSync(dir).filter((file) => fs.statSync(`${dir}/${file}`).isFile() && file.match(/.*\.js$/));
    console.log(files);
    files.forEach((file) => this.load(`${dir}/${file}`));
    return files;
  }

  showHelp(msg) {
    var text = '';
    this.helps.forEach((help) => {
      if ( help.title ) text += `*${help.title}*\n`;
      if ( help.description ) {
        let description = help.description;
        if ( ! Array.isArray(description) ) description = description.split("\n");
        text += description.map((s) => "\t" + s.replace(/^`bot (.+)`/, '`' + this.data.self.name + ' $1`')).join("\n");
      }
      text += "\n";
    });
    msg.send(text);
  }
}

Bot.EVENTS = EVENTS;

module.exports = Bot;
