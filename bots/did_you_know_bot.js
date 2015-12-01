module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function DidYouKnowBot(bot, node){
    var $this = this;
    this.$name = "didyouknow";
    
    ['db/dykb_subscribers.db','db/dykb_feeds.db'].forEach(function(dbFile){
      try{
        if( node.Fs.accessSync(dbFile, node.Fs.R_OK) )
          node.Fs.unlinkSync(dbFile);
      } catch(ex) { console.log(ex); }
    });
    
    var db = {
      subscriber: new node.DataStore({ filename: 'db/dykb_subscribers.db', autoload: true }),
      feed: new node.DataStore({ filename: 'db/dykb_feeds.db', autoload: true })
    };
    var fid = 0, lastFeedId = 0;

    var req = node.Request('http://didyouknowblog.com/rss'), 
        feedparser = new node.FeedParser(),
        errHandler = function (error) {
          // handle any request errors
          console.log("DidYouKnowBot: ", error);
        }

    req.on('error', errHandler); 
    feedparser.on('error', errHandler);
    
    req.on('response', function (res) {
      if (res.statusCode != 200) return errHandler("Bad Status Code");
      this.pipe(feedparser);
    });
    
    feedparser.on('readable', function() {
      var stream = this, item;
      while (item = stream.read()) {
        var matches = [];
        item.description.replace(/\<img\s*src\=\"([^\"]+)\"\/\>/,
          function(f, a, b){
            matches.push(a);
          });
        
        db.feed.insert({ 
          title: item.title, link: item.link, img: matches[0], 
          fid: fid++
        }, function(err, feed){
          if(err) return errHandler(err);
        });
      }
    });
    
    var sub = {
      getSub: function(id){
        return new Promise(function(resolve, reject){
          var q = db.subscriber;
          if(id)
            q = q.findOne({ id: id });
          else
            q = q.find({});
            
          q.exec(function(err, subscriber){
            if(err) reject(err);
            resolve(subscriber);
          });
        })
      },
      getFeed: function(limit){
        return new Promise(function(resolve, reject){
          var q = db.feed.find({ fid: { $gt: lastFeedId } })
          
          q.sort({ fid: 1 })
          
          if(limit)
            q = q.limit(limit)
          
          q.exec(function(err, feeds){
            if(err) reject(err);
            if(feeds.length > 0){
              lastFeedId = feeds[feeds.length - limit].fid;
            }
            resolve(feeds);
          });
        })
      },
      sendFeeds: function(feeds, chatid){
        return new Promise(function(resolve, reject){
          feeds.forEach(function(feed){
            var feedReq = node.Request(feed.img), feedImg = node.Fs.createWriteStream('tmp/'+feed.fid+'.png');
            
            feedReq.on('response', function(res){
              this.pipe(feedImg);
            });
            feedImg.on('finish', function(){
              
              if(chatid)
                return bot.sendPhoto(chatid, node.Path.resolve('tmp/'+feed.fid+'.png') , {}, function(err){
                  if(err) reject(err);
                  try{ node.Fs.unlinkSync('tmp/'+feed.fid+'.png'); }
                  catch(ex){ }
                  resolve();
                });
                
              sub.getSub().then(function(subs){
                console.log("Sending DYKs to ", subs);
                var lasti;
                if(subs.length == 0) resolve('Empty!');
                subs.forEach(function(_sub, i){
                  lasti = i;
                  bot.sendPhoto(_sub.id, node.Path.resolve('tmp/'+feed.fid+'.png') , {}, function(err){
                    if(err) reject(err);
                    try{ node.Fs.unlinkSync('tmp/'+feed.fid+'.png'); }
                    catch(ex){}
                    if(lasti == subs.length) 
                      resolve();
                  });
                });
              });
            });
          });
        });
      },
      cron: function(){
        new node.Cron(
          '0 9 * * *', // cron syntax
          function() {
            // the DO
            sub.getFeed(1).then(function(feeds){
              return sub.sendFeeds(feeds);
            }).then(function(err){
              if(err) errHandler(err);
            }).catch(errHandler);
          }, function () {
            // do nothing on stop
          },
          true,
          'Asia/Kuala_Lumpur'
        );
      }
    }
    
    function Subscribe(params, msg){
      sub.getSub(msg.chat.id).then(function(subscriber){
        if(subscriber)
          return bot.sendMessage(msg.chat.id, "Already subscribed");
        
        db.subscriber.insert({ id: msg.chat.id }, function(err){
          if(err) return errHandler(err);
          bot.sendMessage(msg.chat.id, "Successfully subcribed");
        })
      })
    }
    Subscribe.$noArgs = true;
    this.$tasks['subscribe'] = Subscribe;
    this.$desc['subscribe'] = '- Initiate subscribe';
    
    function fetchNext(params, msg){
      sub.getFeed(1).then(function(feeds){
        return sub.sendFeeds(feeds, msg.chat.id);
      }).then(function(err){
        if(err) errHandler(err);
      }).catch(errHandler);
    }
    fetchNext.$noArgs = true;
    this.$tasks['next'] = fetchNext;
    this.$desc['next'] = "- Fetch the next didyouknow";
    
    this.init(bot);
    sub.cron();
  }
  DidYouKnowBot.prototype = new Bot();
  DidYouKnowBot.prototype.constructor = DidYouKnowBot;
  
  return DidYouKnowBot;
}();