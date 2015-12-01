var TelegramBot = require('node-tg-bot');
var token = process.env["TG_PIBOT_TOKEN"];
bot = new TelegramBot(token, { polling: true });

var Node = { 
  glob: require('glob'), 
  DataStore: require('nedb'), 
  SecureRandom: require('securerandom'),
  Cron: require('cron').CronJob,
  Request: require('request'),
  FeedParser: require('feedparser'),
  upndown: require('upndown'),
  Fs: require('fs'),
  Path: require('path')
};

var hwndBot, tmpBot;
Node.glob.sync("./bots/*.js").forEach(function(botFile){
  tmpBot = require(botFile);
  hwndBot = new tmpBot(bot, Node);
});
