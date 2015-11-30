
# node-tg-bot

node-tg-bot is a node module for implementing Telegram bots in Nodejs using Webhook or polling method

## How to install

```js

npm install node-tg-bot

```

## Getting Started

```js

var TelegramBot = require('node-tg-bot');

```

Then to create a bot (the polling way)

```js

var token = 'YOUR BOT TOKEN';
var bot = new TelegramBot(token, {polling: true});

```

Or the webhook way (see [https://core.telegram.org/bots/self-signed](https://core.telegram.org/bots/self-signed) to create your self signed ssl cert/key)

```js

var bot = new TelegramBot(token, {
    webHook: {
        key: 'your_private.key',
        cert: 'your_public.pem'
    }
});

```

Then if you are using a webhook

```js

bot.setWebHook('https://yourdomain.com:port/' + token, 'your_public.pem', function (data) {
    if (!data) {
        console.log('webhook estabilished');
    } else {
        console.log(data);
    }
});

```

## Commands

Since node-tg-bot is an event emitter you can simply listen for events to be fired when commands with the same name are called

```js

bot.on('foo', function (params, msg) {
    //on foo command
    bot.sendMessage(msg.chat.id, 'Bar!');
}).on('bar', function (params, msg) {
    //on bar message
    bot.sendMessage(msg.chat.id, 'Foo!');
});

```

Command parameters are passed in the params argument

```js

/*
    /hello world
*/
bot.on('hello', function (params, msg) {
    bot.sendMessage(msg.chat.id, 'Hello, ' + params[0]);
});

```

Some events are emitted by default by node-tg-bot such as 'update'. This event is called everytime an update is available

```js

bot.on('update', function(update) {
    console.log(update);
});

```

or the '' event, called whenever an unknown command is sent

```js

bot.on('', function (params, msg) {
    console.log('uknown command, ' + params[0]);
});

```

## Methods

### setWebHook

### getMe

### sendMessage

### forwardMessage

### sendPhoto

### sendAudio

### sendVoice

### sendVideo

### sendDocument

### sendSticker

### sendChatAction

### sendLocation