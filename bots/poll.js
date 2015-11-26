module.exports = function(){
  var polls = [], $bot = null;
  var tasks = {
    "poll.start": function(params, msg){
      var statement = params.join(" ");
      polls.push({
        "statement": statement,
        "choices": [],
        "owner": msg.from.username
      });
      $bot.sendMessage(msg.chat.id, "Poll started for idea/question: "+statement+". Poll ID is: P"+(polls.length));
    },
    "poll.choice": function(params, msg){
      var pollid = parseInt(params.shift().substring(1)), choice = params.join(" ");
      var poll = polls[pollid-1];
      
      if(poll){
        if(poll.owner == msg.from.username){
          poll.choices.push({ text: choice, votes: [] });
          $bot.sendMessage(msg.chat.id, "Added choice to poll P"+pollid+": C"+(poll.choices.length)+") "+choice);
        } else {
          $bot.sendMessage(msg.chat.id, "Only "+poll.owner+" is allowed to add/remove choice to poll P"+pollid);
        }
      } else {
        $bot.sendMessage(msg.chat.id, "There is no poll with ID: P"+pollid);
      }
    },
    "poll.vote": function(params, msg){
      var pollid = parseInt(params.shift().substring(1)), choice = parseInt(params.shift().substring(1));
      var poll = polls[pollid-1];
      if(poll){
        var _choice = poll.choices[choice-1];
        var canVote = !_choice.votes[0] || _choice.votes.filter(function(vote){
          return vote.voter == msg.from.id;
        }).length == 0;
        if( canVote ){
          _choice.votes.push({ voter: msg.from.id, choice: choice-1 });
          $bot.sendMessage(msg.chat.id, "Vote OK for P"+pollid);
        } else {
          $bot.sendMessage(msg.from.id, "You already voted for poll P"+pollid);
        }
      } else {
        $bot.sendMessage(msg.chat.id, "There is no poll with ID: P"+pollid);
      }
    },
    "poll.peek": function(params, msg){
      var pollid = parseInt(params.shift().substring(1));
      var poll = polls[pollid-1];
      if(poll){
        var toString = "Poll P"+pollid+"\n"+poll.statement+"\n";
        poll.choices.forEach(function(choice, i){
          toString += "C"+(i+1)+")"+choice.text+" ["+choice.votes.length+" Votes] \n";
        });
        $bot.sendMessage(msg.chat.id, toString);
      } else {
        $bot.sendMessage(msg.chat.id, "There is no poll with ID: P"+pollid);
      }
    }
  };
  return {
    init: function(bot){
      $bot = bot;
      Object.keys(tasks).forEach(function(key){
        console.log("\tRegistering Command:", key);
        $bot.on(key, tasks[key]);
      });
    }
  }
}();