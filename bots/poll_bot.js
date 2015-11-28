module.exports = function(){
  var Bot = require('../bot_skel.js');
  
  function PollBot(bot, node){
    var $this = this;
    var db = {
      polls: new node.DataStore({ filename: 'db/polls.db', autoload: true }),
      choices: new node.DataStore({ filename: 'db/choices.db', autoload: true }),
      votes: new node.DataStore({ filename: 'db/votes.db', autoload: true }),
    };
    
    this.$name = "poll";
    
    function listPoll(params, msg){
      db.polls.find({}, function(err, polls){
        if(polls.length == 0)
          bot.sendMessage(msg.chat.id, "No poll created as of now.");
        else
          polls.forEach(function(poll){
            $this.$tasks["peek"]([poll.id], msg);
          })
      });
    };
    listPoll.$noArgs = true;
    this.$tasks["list"] = listPoll;
    this.$desc["list"] = "- Display all polls";
    
    this.$tasks["create"] = function(params, msg){
      var pid = node.SecureRandom.hex(1).toUpperCase();
      db.polls.insert({ id: pid, title: params.join(" "), oid: msg.from.id, oname: msg.from.username },
        function(err, poll){
          if(err)
            bot.sendMessage(msg.from.id, "Failed to create poll. Reason: "+err);
          else
            bot.sendMessage(
              msg.chat.id, "Poll created with id:"+pid+"\n"+
                           "'"+poll.title+"'\n"+
                           "By @" + poll.oname
            );
        })
    };
    this.$desc["create"] = "<poll text> - Create new poll based on <poll text>";
    
    this.$tasks["option"] = function(params, msg){
      var pid = params.shift().toUpperCase();
      db.polls.findOne({ id: pid, oid: msg.from.id }, function(err, poll){
        if(err)
          bot.sendMessage(msg.from.id, "Failed to find poll. Reason: "+err);
        else{
          if(poll){
            var cid = node.SecureRandom.hex(1).toUpperCase();
            db.choices.insert({ id: cid, poll_id:poll.id, title: params.join(" ") }, function(err, choice){
              bot.sendMessage(msg.chat.id, "Poll "+poll.id+"\n" +
                "'"+poll.title+"' has new choice:\n"+
                choice.id + ") "+choice.title);
            })
          }else{
            bot.sendMessage(msg.from.id, "Failed to find poll. ");
          }
        }  
      })
    }
    this.$desc["option"] = "<poll id> <option text> - Add new option to poll";
    
    this.$tasks["vote"] = function(params, msg){
      try{
        var pid = params.shift().toUpperCase(), cid = params.shift().toUpperCase();
        db.polls.findOne({ id: pid }, function(err, poll){
          if(err)
            bot.sendMessage(msg.from.id, "Failed to find poll. Reason: "+err);
          else{
            db.choices.findOne({ id: cid, poll_id: pid }, function(err, choice){
              var vid = node.SecureRandom.hex(1).toUpperCase();
              if(choice){
                db.votes.find({ poll_id: pid, oid: msg.from.id}, function(err, vote){
                  if(!err && vote.length > 0){
                    bot.sendMessage(msg.chat.id, "You already voted '"+choice.title+"' for this poll");  
                  } else {
                    db.votes.insert({ id: vid, cid: cid, poll_id: pid, oid: msg.from.id }, function(err, vote){
                      bot.sendMessage(msg.chat.id, "You voted '"+choice.title+"' for poll '"+poll.title+"'");  
                    })
                  }
                })
              } else {
                bot.sendMessage(msg.from.id, "Failed to find choice. ");
              }
            })
          }
        });
      } catch (ex){
        $this.$tasks["desc"](["vote"], msg);
      }
    }
    this.$desc["vote"] = "<poll id> <option id> - Vote the poll";
    
    this.$tasks["peek"] = function(params, msg){
      var pid = params.shift().toUpperCase();
      db.polls.findOne({ id: pid }, function(err, poll){
        if(err || !poll)
          bot.sendMessage(msg.from.id, "Failed to find poll. Reason: "+err);
        else{
          var out = "Poll "+poll.id+"\n'"+poll.title+"'\n by @"+poll.oname+":\n";
          db.choices.find({ poll_id: pid }, function(err, choices){
            var lasti = -1;
            choices.forEach(function(choice, i){
              var choiceOut = choice.id + ") "+choice.title + "["
              db.votes.count({ cid: choice.id, poll_id: pid }, function(err, count){
                choiceOut += count.toString() + " votes]\n";
                out += choiceOut;
                if(lasti == i)
                  bot.sendMessage(msg.chat.id, out);
              })
              lasti = i;
            });
          })
        }
      });
    }
    this.$desc["peek"] = "<poll id> - Display summary of a poll";
    
    this.$tasks["del"] = function(params, msg){
      var pid = params.shift().toUpperCase();
      db.polls.findOne({ id: pid }, function(err, poll){
        if(err || !poll)
          bot.sendMessage(msg.from.id, "Failed to find poll. Reason: "+err); 
        else{
          if(poll.oid != msg.from.id)
            bot.sendMessage(msg.chat.id, "Only owner of poll allowed to remove the poll");
          else{
            db.polls.remove({ id: pid }, function(err, numRemoved){
              if(err)
                bot.sendMessage(msg.from.id, "Failed to remove poll, "+err);
              else
                bot.sendMessage(msg.chat.id, "Poll "+pid+" removed successfully");
            });
          }
        }
      });
    }
    this.$desc["del"] = "<poll id> - Delete a poll";
    
    this.$tasks["deloption"] = function(params, msg){
      var pid = params.shift().toUpperCase(), cid = params.shift().toUpperCase();
      db.polls.findOne({ id: pid }, function(err, poll){
        if(err || !poll)
          bot.sendMessage(msg.from.id, "Failed to find poll. Reason: "+err); 
        else{
          if(poll.oid != msg.from.id)
            bot.sendMessage(msg.chat.id, "Only owner of poll allowed to remove option of a poll");
          else{
            db.choices.findOne({ id: cid, poll_id: pid }, function(err, choice){
              if(choice){
                db.choices.remove({ id: cid }, function(err, nRemoved){
                  if(err)
                    bot.sendMessage(msg.from.id, "Failed to remove choice, "+err);
                  else
                    bot.sendMessage(msg.chat.id, "Choice "+cid+" removed successfully");
                });
              } else {
                bot.sendMessage(msg.from.id, "No such choice '"+cid+"'")
              }
            })
          }
        }
      });
    }
    this.$desc["deloption"] = "<poll id> <option id> - Remove an option from a poll";
    
    this.init(bot);
  }
  PollBot.prototype = new Bot();
  PollBot.prototype.constructor = PollBot;
  
  return PollBot;
}();