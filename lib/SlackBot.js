const Slack = require('@slack/client');
const SlackMessage = require('./SlackMessage');
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

class SlackBot extends EventEmitter {
  constructor(token, opts = {}) {
    super();
    const debug = opts.debug !== undefined ? opts.debug : process.env.NODE_ENV !== 'production';
    const logLevel = debug ? 'debug' : 'error';
    this._client = {
      rtm: new Slack.RtmClient(token, { logLevel }),
      web: new Slack.WebClient(token, { logLevel }),
    };
    this.logger = opts.logger || console;
    this.helps = [];

    this._client.rtm.on(Slack.CLIENT_EVENTS.RTM.AUTHENTICATED, (data) => {
      this.default_channel = opts.default_channel
        ? data.channels.filter((c) => c.name === opts.default_channel)[0]
        : data.channels.filter((c) => c.is_general)[0];
      this.data = data;
      this.emit(EVENTS.AUTHENTICATED, data);
      this.respond(/help$/i, this.showHelp.bind(this));
    });
    this._client.rtm.on(Slack.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => this.emit(EVENTS.CONNECTION.OPENED));
    this._client.rtm.on(Slack.RTM_EVENTS.MESSAGE, this._onReceive.bind(this));
    this.setMaxListeners(Infinity);
  }

  _onReceive(message) {
    if ( ! message.text ) return;
    var p = Promise.resolve( new SlackMessage(this, message) );
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
    return new Promise((resolve, reject) => {
      this.on(EVENTS.CONNECTION.OPENED, resolve);
      this._client.rtm.start();
    });
  }

  send(msg) {
    return new Promise((resolve, reject) => {
      if ( typeof msg !== 'object' ) msg = { text: msg };
      msg.channel = msg.channel || this.default_channel.id;
      msg.type = msg.type || Slack.RTM_EVENTS.MESSAGE;
      msg.attachments ? this._sendWeb(msg, resolve) : this._client.rtm.send(msg, resolve);
    });
  }

  _sendWeb(msg, cb) {
    msg.as_user = true;
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
      if ( msg.match = pattern.match(msg) ) cb( Object.assign({}, msg) );
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

SlackBot.EVENTS = EVENTS;

module.exports = SlackBot;
