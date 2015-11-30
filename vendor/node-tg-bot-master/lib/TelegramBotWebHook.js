var https = require('https');
var http = require('http');
var util = require('util');
var fs = require('fs');

var TelegramBotWebHook = function (token, options, callback) {
    this.token = token;
    this.callback = callback;
    
    if (typeof options === 'boolean') {
        options = {};
    }
    options.port = options.port || 8443;
    var binded = this._requestListener.bind(this);

    if (options.key && options.cert) { // HTTPS Server
        //https webhook enabled
        var opts = {
            key: fs.readFileSync(options.key),
            cert: fs.readFileSync(options.cert)
        };
        this._webServer = https.createServer(opts, binded);
    } else {
        //http webhook enabled
        this._webServer = http.createServer(binded);
    }

    this._webServer.listen(options.port);
};

TelegramBotWebHook.prototype._requestListener = function (req, res) {
    var self = this;
    var regex = new RegExp(this.token);

    // If there isn't token on URL
    if (!regex.test(req.url)) {
        var body = 'invalid token';
        res.writeHead(200, {
            'Content-Length': body.length,
            'Content-Type': 'text/html'
        });
        res.statusCode = 401;
        res.end(body);
    } else if (req.method === 'POST') {
        var fullBody = '';
        req.on('data', function (chunk) {
            fullBody += chunk;
        });
        req.on('end', function (response) {
            try {
                var data = JSON.parse(fullBody);
                self.callback(data);
            } catch (error) {
            }
            res.end('OK');
        });
    } else { // Authorized but not a POST
        res.statusCode = 418; // I'm a teabot!
        res.end();
    }
};

module.exports = TelegramBotWebHook;