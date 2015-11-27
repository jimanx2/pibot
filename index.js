var TelegramBot = require('node-tg-bot');
var token = process.env["TG_PIBOT_TOKEN"];
bot = new TelegramBot(token, { polling: true });
bot.on('update', function(update) {
  console.log(update);
});

var Node = { glob: require('glob'), DataStore: require('nedb'), SecureRandom: require('securerandom') };

var hwndBot, tmpBot;
Node.glob.sync("./bots/*.js").forEach(function(botFile){
  tmpBot = require(botFile);
  hwndBot = new tmpBot(bot, Node);
});
