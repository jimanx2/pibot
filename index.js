var TelegramBot = require('node-tg-bot');
var token = "";

bot = new TelegramBot(token, { polling: true });

bot.on('update', function(update) {
    console.log(update);
});

bot.on('foo', function(params, msg){
  bot.sendMessage(msg.chat.id, 'Bar!');
}).on('bar', function(params, msg){
  bot.sendMessage(msg.chat.id, 'Foo!');
});
