class SlackMessage {
  constructor(bot, msg) {
    this._bot = bot;
    this._msg = msg;
    this.text = msg.text;
  }

  isMention() {
    return this._msg.text.match( new RegExp(`<@${this._bot.data.self.id}>`) );
  }

  isDirectMention() {
    return this._msg.text.match( new RegExp(`^<@${this._bot.data.self.id}>.+`) );
  }

  isDirectMessage() {
    return false; // TODO
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
    this._bot.send(msg);
  }

  reply(msg) {
    msg = this._format(msg);
    msg.text = `<@${this._msg.user}> ${msg.text}`;
    this._bot.send(msg);
  }
}

module.exports = SlackMessage;
