var TelegramBot = require('node-tg-bot');
var Node = { fs: require('fs'), glob: require('glob') };
var token = process.env["TG_PIBOT_TOKEN"];

bot = new TelegramBot(token, { polling: true });

bot.on('update', function(update) {
    console.log(update);
});

var hwndBot = null;
Node.glob.sync("./bots/*.js").forEach(function(botFile){
  console.log("Registering BotFile:", botFile);
  hwndBot = require(botFile);
  hwndBot.init(bot);
});
