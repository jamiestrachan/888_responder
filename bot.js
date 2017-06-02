var twit = require('twit');
var config = require('./config.js');
const fs = require('fs');
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

function prettyPrintDate(date_string) {
  var date_object = new Date(date_string);
  var formatted_date = date_object.toDateString();
  var date_pieces = formatted_date.match(/[A-z]+ ([A-z]+) ([0-9]+) ([0-9]+)/);
  return date_pieces[1] + " " + date_pieces[2] + ", " + date_pieces[3];
}

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
  var original_tweet_id = tweet.id;
  console.log(original_tweet_id);
  // Who sent the tweet?
  var name = tweet.user.screen_name;
  // What is the text?
  var txt = tweet.text;

  // Ok, if this was in reply to me
  if (reply_to === '888yongeandold') {

    // Get rid of the @ mention
    txt = txt.replace(/@888yongeandold/g,'');

    var lasttime_results = txt.match(/When was the last time ([^;'"=]+) played there\?/i);
    //console.log(lasttime_results);
    if (lasttime_results) {
      //connection.connect();

      connection.query(
        'SELECT * from Concerts WHERE headliner LIKE "%' + lasttime_results[1] + '%" ORDER BY date DESC LIMIT 1',
        function (error, results, fields) {
          if (error) throw error;
          var reply = '.@'+name + ' ';
          if (results.length > 0) {
            reply += results[0].headliner + ' played here at ' + results[0].venue_name + ' on ' + prettyPrintDate(results[0].date);
          } else {
            reply += "Sorry, I don't when " + lasttime_results[1] + " last played here. Maybe check https://en.wikipedia.org/wiki/Masonic_Temple_(Toronto)";
          }

          T.post('statuses/update', { status: reply, in_reply_to_status_id: original_tweet_id }, tweeted);
        }
      );
    }

    var pictures_results = txt.match(/Do you have any pictures of ([^;'"=]+)\?/i);
    //console.log(pictures_results);
    if (pictures_results) {
      //connection.connect();

      connection.query(
        'SELECT * from Concerts WHERE headliner LIKE "%' + pictures_results[1] + '%" AND local_image IS NOT NULL ORDER BY rand() LIMIT 1',
        function (error, results, fields) {
          if (error) throw error;
          var reply = '.@'+name + ' ';
          if (results.length > 0) {
            var b64content = fs.readFileSync(results[0].local_image, { encoding: 'base64' })

            // first we must post the media to Twitter
            T.post('media/upload', { media_data: b64content }, function (err, data, response) {
              // now we can assign alt text to the media, for use by screen readers and
              // other text-based presentations and interpreters
              var mediaIdStr = data.media_id_string
              var altText = pictures_results[1] + " at " + results[0].venue_name;
              var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

              T.post('media/metadata/create', meta_params, function (err, data, response) {
                if (!err) {
                  // now we can reference the media and post a tweet (media will attach to the tweet)
                  var params = {
                    status: reply + "I do! Here's " + pictures_results[1] + " at " + results[0].venue_name + " on " + prettyPrintDate(results[0].date),
                    in_reply_to_status_id: original_tweet_id,
                    media_ids: [mediaIdStr]
                  }
                  console.log(params);

                  T.post('statuses/update', params, tweeted);
                }
              })
            })

          } else {
            reply += "No I don't. Sorry :(";
            T.post('statuses/update', { status: reply }, tweeted);
          }

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
