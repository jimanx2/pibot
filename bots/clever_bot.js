module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function CleverBot(bot, node){
    var $this = this;
    this.$name = "ai";
    
    var $listening = false, convId = null,
        $asking = false;
    var Cleverbot = require('cleverbot-node');
    cleverbot = new Cleverbot;
    
    function startListen(params, msg){
      Cleverbot.prepare(function(){
        convId = msg.chat.id;
        bot.sendMessage(convId, "Yes sir?");
        $listening = true;
      });
    };
    startListen.$noArgs = true;
    this.$tasks["start"] = startListen;
    this.$desc["start"] = "- Start the AI";
    function doneListen(){
      $listening = false;
      $asking = false;
      convId = null;
      bot.sendMessage(convId, "Ok. Tata...");
    }
    doneListen.$noArgs = true;
    this.$tasks["done"] = doneListen;
    this.$desc["done"] = "- Stop the AI";
    
    bot.on($this.$name, function(params, msg){
      if(params.length == 0)
        return $this.$tasks["desc"]([], msg);

      task = params.shift();
      if(!$this.$tasks[task])
        return $this.$tasks["desc"]([], msg);

      if(params.length == 0 && !$this.$tasks[task].$noArgs)
        return $this.$tasks["desc"]([task], msg);

      $this.$tasks[task](params, msg);
    });
    
    bot.on('update', function(update) {
      console.log("CleverBot :", update.message.text);
      
      if( update.message.text.trim()[0] == "/" ) return;
      var params = update.message.text.split(" ");
      var keyword = params.shift();
      
      // not the required chat
      if( !convId ){
        return;
      }
      if( update.message.chat.id != convId ){
        console.log(update.message.chat.id,"!=", convId);
        return;
      }

      params.unshift(keyword);
      var phrase = params.join(' ');
      // console.log("Sending ",phrase );
      if($asking)
        return bot.sendMessage(convId, "Please wait. I'm thinking.", {
          reply_to_message_id: update.message.message_id
        });

      $asking = true;  
      cleverbot.write(phrase, function (response) {
        // console.log("Got ",response );
        bot.sendMessage(convId, response.message, {
          reply_to_message_id: update.message.message_id
        });
        $asking = false;
      });
    });
  }
  CleverBot.prototype = new Bot();
  CleverBot.prototype.constructor = CleverBot;
  
  return CleverBot;
}();