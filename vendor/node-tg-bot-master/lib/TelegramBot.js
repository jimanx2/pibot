var TelegramBotPolling = require('./TelegramBotPolling.js');
var TelegramBotWebHook = require('./TelegramBotWebHook.js');
var REQUEST = require("request");
var PATH = require('path');
var URL = require('url');
var FS = require('fs');
var MIME = require('mime');
var STREAM = require('stream');
var UTIL = require('util');
var EVENT_EMITTER = require('events').EventEmitter;

/**
    * Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
    * on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a valid (not self signed) SSL certificate.
    * Emmits `message` when a message arrives.
    *
    * @class TelegramBot
    * @constructor
    * @param {String} token Bot Token
    * @param {Object} [options]
    * @param {Boolean|Object} [options.polling=false] Set true to enable polling or set options
    * @param {String|Number} [options.polling.timeout=4] Polling time
    * @param {String|Number} [options.polling.interval=2000] Interval between requests in miliseconds
    * @param {Boolean|Object} [options.webHook=false] Set true to enable WebHook or set options
    * @param {String} [options.webHook.key] PEM private key to webHook server
    * @param {String} [options.webHook.pem] PEM certificate key to webHook server
    * @see https://core.telegram.org/bots/api
*/
var TelegramBot = function (token, options) {
    options = options || {};
    this.token = token;
    if (options.polling) {
        this.polling = new TelegramBotPolling(token, options.polling, this.processUpdate.bind(this));
    }
    if (options.webHook) {
        this.webhook = new TelegramBotWebHook(token, options.webHook, this.processUpdate.bind(this));
    }
};

UTIL.inherits(TelegramBot, EVENT_EMITTER);


TelegramBot.prototype._parseCommand = function (str, lookForQuotes) {
    var args = [];
    var readingPart = false;
    var part = '';
    for(var i=0; i < str.length; i++) {
        if(str.charAt(i) === ' ' && !readingPart) {
            args.push(part);
            part = '';
        } else {
            if(str.charAt(i) === '\"' && lookForQuotes) {
                readingPart = !readingPart;
            } else {
                part += str.charAt(i);
            }
        }
    }
    args.push(part);
    return args;
};

TelegramBot.prototype.processUpdate = function (update) {
    this.emit('update', update);
    if (update.message) {
        if (update.message.text) {
            if (update.message.text.substring(0, 1) === '/') {
                var params = this._parseCommand(update.message.text, true);
                if (params[0].length > 1) {
                    var command = params.shift().substring(1).toLowerCase();
                    if (!this._events[command]) {
                        this.emit('', params, update.message);
                    }
                    this.emit(command, params, update.message);
                    bot.emit('from.' + update.message.from.id, update.message);
                }
            }
        }
    }
};

TelegramBot.prototype.request = function (path, options, callback) {
    var self = this;
    callback = callback || function() {};
    if (!this.token) {
        callback.apply(this, [new Error('Telegram Bot Token not provided!')]);
    }
    options = options || {};
    options.url = URL.format({
        protocol : 'https',
        host     : 'api.telegram.org',
        pathname : '/bot' + this.token + '/' + path
    });
    REQUEST(options, function (error, response, body) {
        if (error) {
            return callback.apply(this, [new Error(error)]);
        }
        if (response.statusCode !== 200) {
            callback.apply(this, [new Error(response.statusCode + ' ' + body)]);
        }
        try{
            var data = JSON.parse(body);
        } catch (e) {
            callback.apply(self, [new Error('Malformed Json')]);
            return false;
        }
        if (data.ok) {
            callback.apply(self, [null, data.result]);
        } else {
            return callback.apply(this, [new Error(data.error_code + ' ' + data.description)]);
        }
    });
};

/**
    * Returns basic information about the bot in form of a `User` object.
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#getme
*/
TelegramBot.prototype.getMe = function (callback) {
    var path = 'getMe';
    this.request(path, null, callback);
};

/**
    * Specify an url to receive incoming updates via an outgoing webHook.
    * @param {String} url URL where Telegram will make HTTP Post. Leave empty to delete webHook.
    * @see https://core.telegram.org/bots/api#setwebhook
*/
TelegramBot.prototype.setWebHook = function (url, certificate, callback) {
    var opts = {
        qs: {
            url: url
        }
    };
    this.formatSendData('certificate', certificate, function (content) {
        opts.formData = content[0];
        this.request('setWebhook', opts, callback);
    });
};

/**
    * Use this method to receive incoming updates using long polling
    * @param  {Number|String} [timeout] Timeout in seconds for long polling.
    * @param  {Number|String} [limit] Limits the number of updates to be retrieved.
    * @param  {Number|String} [offset] Identifier of the first update to be returned.
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#getupdates
*/
TelegramBot.prototype.getUpdates = function (timeout, limit, offset, callback) {
    var query = {
        offset  : offset,
        limit   : limit,
        timeout : timeout
    };
    this.request('getUpdates', {qs: query}, callback);
};

/**
    * Send text message.
    * @param  {Number|String} chatId Unique identifier for the message recipient
    * @param  {String} text Text of the message to be sent
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendmessage
*/
TelegramBot.prototype.sendMessage = function (recipientId, text, options, callback) {
    var query = options || {};
    query.chat_id = recipientId;
    query.text = text;
    this.request('sendMessage', {qs: query}, callback);
};

/**
    * Forward messages of any kind.
    * @param  {Number|String} chatId     Unique identifier for the message recipient
    * @param  {Number|String} fromChatId Unique identifier for the chat where the original message was sent
    * @param  {Number|String} messageId  Unique message identifier
    * @param  {Function} [callback] Callback function
    * @return {Void}
*/
TelegramBot.prototype.forwardMessage = function (recipientId, fromChatId, messageId, callback) {
    var query = {
        chat_id      : recipientId,
        from_chat_id : fromChatId,
        message_id   : messageId
    };
    this.request('forwardMessage', {qs: query}, callback);
};

TelegramBot.prototype.formatSendData = function (type, data, callback) {
    var formData;
    var fileName;
    var fileId;
    var self = this;
    if (data instanceof STREAM.Stream) {
        fileName = URL.parse(PATH.basename(data.PATH)).pathname;
        formData = {};
        formData[type] = {
            value: data,
            options: {
                filename: fileName,
                contentType: MIME.lookup(fileName)
            }
        };
        callback.apply(this, [[formData, fileId]]);
        return;
    } else if (FS.existsSync(data)) {
        fileName = PATH.basename(data);
        formData = {};
        formData[type] = {
            value: FS.createReadStream(data),
            options: {
                filename: fileName,
                contentType: MIME.lookup(fileName)
            }
        };
        callback.apply(this, [[formData, fileId]]);
        return;
    } else {
        REQUEST(data)
            .on('error', function(error) {
                console.log('Error', error);
            }).on('response', function(response) {
                if (PATH.extname(data)) {
                    fileName = PATH.basename(data);
                } else if (response.headers['content-disposition']) {
                    var regexp = /filename[^;=\n]*=([^;\n]*)/gi;
                    fileName = regexp.exec(response.headers['content-disposition'])[1].replace(/"/gi, '').replace(/\'/gi, '');
                } else {
                    fileName = 'file_' + Date.now() + '.'  + MIME.extension(response.headers['content-type']);
                }
                fileName = fileName.replace(/\?.*/, '');
                formData = {};
                formData[type] = {
                    value: response,
                    options: {
                        filename: fileName,
                        contentType: MIME.lookup(fileName)
                    }
                };
                callback.apply(self, [[formData, fileId]]);
                return;
            });
    }
    return;
    fileId = data;
    callback.apply(this, [[formData, fileId]]);
};

/**
    * Send photo
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} photo A file path or a Stream. Can also be a `file_id` previously uploaded
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendphoto
*/
TelegramBot.prototype.sendPhoto = function (chatId, photo, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    this.formatSendData('photo', photo, function (content) {
        opts.formData = content[0];
        opts.qs.photo = content[1];
        this.request('sendPhoto', opts, callback);
    });
};

/**
    * Send audio
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} audio A file path or a Stream. Can also be a `file_id` previously uploaded.
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendaudio
*/
TelegramBot.prototype.sendAudio = function (chatId, audio, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    this.formatSendData('audio', audio, function (content) {
        opts.formData = content[0];
        opts.qs.audio = content[1];
        this.request('sendAudio', opts, callback);
    });
};

/**
    * Send audio
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} voice A ogg file path or a Stream. Can also be a `file_id` previously uploaded.
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendvoice
*/

TelegramBot.prototype.sendVoice = function (chatId, voice, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    this.formatSendData('voice', voice, function (content) {
        opts.formData = content[0];
        opts.qs.voice = content[1];
        this.request('sendVoice', opts, callback);
    });
};

/**
    * Send Document
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} A file path or a Stream. Can also be a `file_id` previously uploaded.
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendDocument
*/
TelegramBot.prototype.sendDocument = function (chatId, doc, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    this.formatSendData('document', doc, function (content) {
        opts.formData = content[0];
        opts.qs.document = content[1];
        this.request('sendDocument', opts, callback);
    });
};

/**
    * Send .webp stickers.
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} A file path or a Stream. Can also be a `file_id` previously uploaded.
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendsticker
*/
TelegramBot.prototype.sendSticker = function (chatId, sticker, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    this.formatSendData('sticker', sticker, function () {
        opts.formData = content[0];
        opts.qs.sticker = content[1];
        this.request('sendSticker', opts, callback);
    });
};

/**
    * Send video files, Telegram clients support mp4 videos (other formats may be sent whith `sendDocument`)
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String|stream.Stream} A file path or a Stream. Can also be a `file_id` previously uploaded.
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendvideo
*/
TelegramBot.prototype.sendVideo = function (chatId, video, options, callback) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    var content = this.formatSendData('video', video, function (content) {
        opts.formData = content[0];
        opts.qs.video = content[1];
        this.request('sendVideo', opts, callback);
    });
};


/**
    * Send chat action.
    * `typing` for text messages,
    * `upload_photo` for photos, `record_video` or `upload_video` for videos,
    * `record_audio` or `upload_audio` for audio files, `upload_document` for general files,
    * `find_location` for location data.
    *
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {String} action Type of action to broadcast.
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendchataction
*/
TelegramBot.prototype.sendChatAction = function (chatId, action, callback) {
    var query = {
        chat_id: chatId,
        action: action
    };
    this.request('sendChatAction', {qs: query}, callback);
};

/**
    * Use this method to get a list of profile pictures for a user.
    * Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
    *
    * @param  {Number|String} userId  Unique identifier of the target user
    * @param  {Number} [offset] Sequential number of the first photo to be returned. By default, all photos are returned.
    * @param  {Number} [limit] Limits the number of photos to be retrieved. Values between 1100 are accepted. Defaults to 100.
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#getuserprofilephotos
*/
TelegramBot.prototype.getUserProfilePhotos = function (userId, offset, limit, callback) {
    var query = {
        user_id: userId,
        offset: offset,
        limit: limit
    };
    this.request('getUserProfilePhotos', {qs: query}, callback);
};

/**
* Send location.
    * Use this method to send point on the map.
    *
    * @param  {Number|String} chatId  Unique identifier for the message recipient
    * @param  {Float} latitude Latitude of location
    * @param  {Float} longitude Longitude of location
    * @param  {Object} [options] Additional Telegram query options
    * @param  {Function} [callback] Callback function
    * @return {Void}
    * @see https://core.telegram.org/bots/api#sendlocation
*/
TelegramBot.prototype.sendLocation = function (chatId, latitude, longitude, options, callback) {
    var query = options || {};
    query.chat_id = chatId;
    query.latitude = latitude;
    query.longitude = longitude;
    this.request('sendLocation', {qs: query}, callback);
};

module.exports = TelegramBot;
