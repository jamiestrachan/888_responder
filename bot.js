var twit = require('twit');
var config = require('./config.js');
//var server = require('http').createServer();
//var io = require('socket.io')(server);
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : '888yongeandold'
});

var T = new twit(config);

var stream = T.stream('user');

stream.on('tweet', tweetEvent);

// Here a tweet event is triggered!
function tweetEvent(tweet) {

  // If we wanted to write a file out
  // to look more closely at the data
  // var fs = require('fs');
  // var json = JSON.stringify(tweet,null,2);
  // fs.writeFile("tweet.json", json, output);

  // Who is this in reply to?
  var reply_to = tweet.in_reply_to_screen_name;
  // Who sent the tweet?
  var name = tweet.user.screen_name;
  // What is the text?
  var txt = tweet.text;

  // Ok, if this was in reply to me
  if (reply_to === '888yongeandold') {

    // Get rid of the @ mention
    txt = txt.replace(/@888yongeandold/g,'');

    var match_results = txt.match(/When was the last time ([^;'"=]+) played there\?/i);
    //console.log(match_results);
    if (match_results) {
      //connection.connect();

      connection.query(
        'SELECT * from Concerts WHERE headliner LIKE "%' + match_results[1] + '%" ORDER BY date DESC',
        function (error, results, fields) {
          if (error) throw error;
          var previous_date = new Date(results[0].date);
          var formatted_date = previous_date.toDateString();
          var date_pieces = formatted_date.match(/[A-z]+ ([A-z]+) ([0-9]+) ([0-9]+)/);
          var reply = '.@'+name + ' ';
          reply += 'The last time ' + band + ' played here was at ' + results[0].venue_name + ' on ' + date_pieces[1] + " " + date_pieces[2] + ", " + date_pieces[3];
          T.post('statuses/update', { status: reply }, tweeted);
        }
      );

      //connection.end();

    }
  }



// Make sure it worked!
function tweeted(err, reply) {
  if (err !== undefined) {
    console.log(err);
  } else {
    console.log('Tweeted: ' + reply);
  }
};

}
