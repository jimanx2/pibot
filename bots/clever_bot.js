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
        bot.sendMessage(convId, "Yes sir?", { reply_markup: { force_reply: true } });
        $listening = true;
      });
    };
    startListen.$noArgs = true;
    this.$tasks["start"] = startListen;
    this.$desc["start"] = "- Start the AI";
    function doneListen(){
      $listening = false;
      $asking = false;
      bot.sendMessage(convId, "Ok. Tata...");
      convId = null;
    }
    doneListen.$noArgs = true;
    this.$tasks["done"] = doneListen;
    this.$desc["done"] = "- Stop the AI";
    
    bot.on($this.$name, function(params, msg){
      if($listening){
        if(params[0] == "done") return $this.$tasks["done"]([], msg);
        console.log("CleverBot :", params.join(' '));

        // not the required chat
        if( !convId ){
          return;
        }
        if( msg.chat.id != convId ){
          console.log(update.message.chat.id,"!=", convId);
          return;
        }

        var phrase = params.join(' ');
        // console.log("Sending ",phrase );
        if($asking)
          return bot.sendMessage(convId, "Please wait. I'm thinking.", {
            reply_to_message_id: msg.message_id,
            reply_markup: { force_reply: true }
          });

        $asking = true;  
        cleverbot.write(phrase, function (response) {
          // console.log("Got ",response );
          bot.sendMessage(convId, response.message, {
            reply_to_message_id: msg.message_id,
            reply_markup: { force_reply: true }
          });
          $asking = false;
        });
        return;
      }
      
      if(params.length == 0)
        return $this.$tasks["desc"]([], msg);

      task = params.shift();
      if(!$this.$tasks[task])
        return $this.$tasks["desc"]([], msg);

      if(params.length == 0 && !$this.$tasks[task].$noArgs)
        return $this.$tasks["desc"]([task], msg);

      $this.$tasks[task](params, msg);
    });
    
  }
  CleverBot.prototype = new Bot();
  CleverBot.prototype.constructor = CleverBot;
  
  return CleverBot;
}();