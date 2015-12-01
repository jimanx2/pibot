module.exports = function(){
  function Bot(){
    var $this = this;
    // Bot Module Identification
    this.$name = "";
    // Responder
    this.$tasks = {};
    this.$tasks["desc"] = function(params, msg){
      var out = "", tasks = $this.$tasks;
      if(params.length == 1){
        tasks = {};
        tasks[params[0]] = $this.$tasks[params[0]];
      }
      Object.keys(tasks).forEach(function(taskName){
        if(taskName == "desc") return;
        out += taskName + " " + $this.$desc[taskName] + "\n"
      });
      bot.sendMessage(msg.chat.id, out);
    }
    this.$desc = {};
  }
  Bot.prototype.init = function(bot){
    var $this = this, task;
    bot.on($this.$name, function(params, msg){
      if(params.length == 0){
        return $this.$tasks["desc"]([], msg);
      }
        
      task = params.shift();
      if(!$this.$tasks[task]){
        return $this.$tasks["desc"]([], msg);
      }
      
      if(params.length == 0 && !$this.$tasks[task].$noArgs){
        return $this.$tasks["desc"]([task], msg);
      }
      
      $this.$tasks[task](params, msg);
    });
  };
  return Bot;
}();