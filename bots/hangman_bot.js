module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function HangmanBot(bot, node){
    var $this = this;
    
    this.$name = "hang";
    var sessions = {}, getting = false, hangman = [
      ""
    ];
    
    function getStage(msg){
      return new Promise(function(resolve, reject){
        bot.sendMessage(msg.chat.id, "Please wait..");
        getting = true;
        node.Request('http://localhost:3000/workers/hangman', function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var stage = JSON.parse(body);
            getting = false;
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
      
      if(guess.join('') == session.word){
        session.win = true;
        return "You won! ("+session.word+")";
      }

      return "*New Hangman Game*\n"+
        "Category: *"+session.category+"*\n"+
        guess.join('.') + "\n"+
        "You have "+session.live + " live(s) remaining";
    }
    function startGame(params, msg){
      if(sessions[msg.chat.id])
        if(!sessions[msg.chat.id].win || sessions[msg.chat.id].live == 0)
          return bot.sendMessage(msg.chat.id, "Please finish/abort current game first!");
        
      if(getting) return;
      
      getStage(msg).then(function(stage){
        console.log(stage.word);
        sessions[msg.chat.id] = {
          live: 10,
          category: stage.category,
          word: stage.word.toLowerCase(),
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
        char.split('').forEach(function(c){
          session.guesses.push(c);
        })
        
        var sString = stageString(session);
        if(session.win){
          bot.sendMessage(msg.chat.id, sString,{
            parse_mode: "Markdown"
          }, function(err){
            if(session.live == 0)
              $this.$tasks["start"]([], msg);
          });
        } else {
          bot.sendMessage(msg.chat.id, "Nice one!\n\n"+sString,{
            parse_mode: "Markdown"
          });
        }
        
      } else {
        session.live -= 1;
        stg = (10 - session.live);
        pic = './assets/images/stage' + stg + '.txt';
        pic = node.Fs.readFileSync(node.Path.resolve(pic)).toString();
        pic = pic + "\n" + (stg != 10 ? 'Nice try. That\'s wrong.' : 'You lose! :P ('+session.word+')');
        pic = "```\n"+pic+"```\n";
        bot.sendMessage(
          msg.chat.id, 
          pic, { parse_mode: "Markdown" },
          function(err){
            if(err)
              console.log(err);
            bot.sendMessage(msg.chat.id, stageString(session), { parse_mode: "Markdown" });
            return $this.$tasks["start"]([], msg)
          }
        );
      }
    }
    
    bot.on($this.$name, function(params, msg){
      if(params.length == 0)
        return $this.$tasks["desc"]([], msg);

      if(sessions[msg.chat.id]){
        var char = params.shift().toLowerCase();
        if(char == "start") return $this.$tasks["start"](params, msg);
        if(char == "forfeit") return $this.$tasks["forfeit"](params, msg);
        return attempt(msg, char);
      }
      
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