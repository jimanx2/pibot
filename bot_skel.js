module.exports = function(){
  function Bot(){
    // Bot Module Identification
    this.$name = "";
    // Responder
    this.$tasks = {};
  }
  Bot.prototype.init = function(bot){
    var $this = this;
    Object.keys(this.$tasks).forEach(function(key){
      bot.on($this.$name+"."+key, $this.$tasks[key]);
    });
  };
  return Bot;
}();