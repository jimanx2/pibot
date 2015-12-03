module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function HangmanBot(bot, node){
    var $this = this;
    
    this.$name = "hangman";
    var sessions = {};
    
    function getStage(){
      return new Promise(function(resolve, reject){
      
        node.Request('http://localhost:3000/workers/hangman', function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var stage = JSON.parse(body);
            resolve(stage);
          } else {
            reject(error);
          }
        })
      })
    }
    
    function stageString(session){
      var guess = session.word.split('').map(function(c){
        var goodGuess = session.guesses.indexOf(c);
        return goodGuess >= 0 ? session.guesses[goodGuess] : "\\_"; 
      });
      
      return "*New Hangman Game*\n"+
        "Category: *"+session.category+"*\n"+
        guess.join('.') + "\n"+
        "You have "+session.live + " live(s) remaining";
    }
    function startGame(params, msg){
      if(sessions[msg.chat.id])
        return bot.sendMessage(msg.chat.id, "Please finish/abort current game first!");
        
      getStage().then(function(stage){
        sessions[msg.chat.id] = {
          live: 10,
          category: stage.category,
          word: stage.word,
          guesses: []
        }
        bot.sendMessage(
          msg.chat.id, 
          stageString(sessions[msg.chat.id]),
          {
            parse_mode: "Markdown"
          }, function(err){
            if(err) console.log(err);
          }
        );
      }).catch(function(err){
        console.log("Failed to get stage", err);
      })
    };
    
    startGame.$noArgs = true;
    this.$tasks["start"] = startGame;
    this.$desc["start"] = "- Start the hangman game";
    
    function forfeitGame(params, msg){
      if(sessions[msg.chat.id]){
        sessions[msg.chat.id] = null;
        return bot.sendMessage(msg.chat.id, "Heh, told ya, you can't do that one.");
      } else {
        return $this.$tasks["desc"]([], msg);
      }
    }
    forfeitGame.$noArgs = true;
    this.$tasks["forfeit"] = forfeitGame;
    this.$desc["forfeit"] = "- Forfeit a game (Noob much?)";
    
    function attempt(msg, char){
      var session = sessions[msg.chat.id], pic, stg;
      if( !session ) return;
      
      if( session.word.indexOf(char) >= 0 ){
        session.guesses.push(char);
        bot.sendMessage(msg.chat.id, "Nice one!\n\n"+stageString(session),{
          parse_mode: "Markdown"
        });
      } else {
        session.live -= 1;
        stg = (10 - session.live);
        pic = './assets/images/stage' + (stg == 10 ? (stg+'.gif') : (stg+'.png'));
        // console.log(pic);
        bot.sendPhoto(
          msg.chat.id,  node.Path.resolve(pic),
          {
            caption: 'Nice try. That\'s wrong.'
          }
        )
      }
    }
    
    bot.on($this.$name, function(params, msg){
      if(sessions[msg.chat.id]){
        var char = params.shift().toLowerCase();
        if(char == "start") return $this.$tasks["start"](params, msg);
        attempt(msg, char);
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
  HangmanBot.prototype = new Bot();
  HangmanBot.prototype.constructor = HangmanBot;
  
  return HangmanBot;
}();