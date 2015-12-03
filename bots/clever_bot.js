module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function CleverBot(bot, node){
    var $this = this;
    this.$name = "ai";
    
    var greetings = [
      "Hi", "Hey, man", "Hey",
      "How’s it going?",
      "What’s up?",
      "How’s life?",
      "How’s your day going?",
      "Good to see you",
      "It’s been a while",
      "Pleased to meet you",
      "Yo!",
      "You wot m8?",
      "Howdy!",
      "Hiya!"
    ];
    var conversations = {};
    var Cleverbot = require("cleverbot.io");
    
    function setBoredTimer(msg){
      if(conversations[msg.chat.id].buzz)
        clearInterval(conversations[msg.chat.id].buzz);
        
      return setInterval(function(){
        var now = new Date().getTime();
        if(now - conversations[msg.chat.id].lastHumanReply >= 5*60*1000)
          askBot(msg, "New topic", true);
      }, 20*60*1000)
    }
    function startListen(params, msg){
      if(conversations[msg.chat.id])
        return bot.sendMessage(msg.chat.id, "Already started");
      
      var cleverbot = new Cleverbot("JQU5usm68qkXWHKQ", "g0giw78pG84AUw684798zYDWVMSu1FRj");
      cleverbot.setNick("session"+msg.chat.id);
      cleverbot.create(function (err, nick) {        
        conversations[msg.chat.id] = { 
          bot: cleverbot, ref: nick, $asking: false, $listening: true,
          buzz: setBoredTimer(msg),
          lastHumanReply: 0
        };
        bot.sendMessage(msg.chat.id, greetings[Math.floor(Math.random()*greetings.length)]);
      });
    };
    startListen.$noArgs = true;
    this.$tasks["start"] = startListen;
    this.$desc["start"] = "- Start the AI";
    function doneListen(params, msg){
      conversations[msg.chat.id].$listening = false;
      conversations[msg.chat.id].$asking = false;
      bot.sendMessage(msg.chat.id, "Ok. Tata...");
      conversations[msg.chat.id] = null;
      
    }
    doneListen.$noArgs = true;
    this.$tasks["done"] = doneListen;
    this.$desc["done"] = "- Stop the AI";
    
    function askBot(msg, phrase, noReply){
      conversations[msg.chat.id].buzz = setBoredTimer(msg);
      conversations[msg.chat.id].$asking = true;
      conversations[msg.chat.id].bot.ask(phrase, function (err, response) {
        bot.sendMessage(msg.chat.id, response, {
          reply_to_message_id: noReply ? false : msg.message_id,
          reply_markup: { force_reply: true }
        });
        conversations[msg.chat.id].$asking = false;
      });
    }
    
    bot.on($this.$name, function(params, msg){
      if(conversations[msg.chat.id]){
        if(!conversations[msg.chat.id].$listening) return $this.$tasks["desc"]([], msg);
        if(params[0] == "done") return $this.$tasks["done"]([], msg);
        console.log("CleverBot :", params.join(' '));

        // not the required chat

        var phrase = params.join(' ');
        // console.log("Sending ",phrase );
        if(conversations[msg.chat.id].$asking)
          return bot.sendMessage(msg.chat.id, "Please wait. I'm thinking.", {
            reply_to_message_id: msg.message_id,
            reply_markup: { force_reply: true }
          });

        askBot(msg, phrase);
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
