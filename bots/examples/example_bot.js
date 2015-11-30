module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function ExampleBot(bot, node){
    var $this = this;
    
    this.$name = "example";
    
    function egFunc(params, msg){
      bot.sendMessage(msg.chat.id, "Hello")
    };
    
    egFunc.$noArgs = true;
    this.$tasks["list"] = egFunc;
    this.$desc["list"] = "- Just an example bot";
    
    this.init(bot);
  }
  ExampleBot.prototype = new Bot();
  ExampleBot.prototype.constructor = ExampleBot;
  
  return ExampleBot;
}();