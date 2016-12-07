const clone = require('clone');

class Message {
  constructor(bot, msg) {
    this._bot = bot;
    this._msg = msg;
    this.text = msg.text.replace(/^<@.+?> /, '');
    this.user = clone( bot.data.users.filter((u) => u.id === msg.user)[0] );
  }

  isMention() {
    return this._msg.text.match( new RegExp(`<@${this._bot.data.self.id}>`) );
  }

  isDirectMention() {
    return this._msg.text.match( new RegExp(`^<@${this._bot.data.self.id}>.+`) );
  }

  isDirectMessage() {
    return !! this._bot.data.ims.filter((im) => im.id === this._msg.channel)[0];
  }

  _format(msg) {
    if ( typeof msg !== 'object' ) {
      msg = { text: msg };
    }
    msg.channel = this._msg.channel;
    return msg;
  }

  send(msg) {
    msg = this._format(msg);
    return this._bot.send(msg);
  }

  reply(msg) {
    msg = this._format(msg);
    msg.text = `<@${this._msg.user}> ${msg.text}`;
    return this._bot.send(msg);
  }
}

module.exports = Message;
