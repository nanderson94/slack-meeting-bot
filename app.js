var request = require("request");
var config = require("./config.json");
var util = require("util");
var moment = require("moment-timezone")

// Set our date range from 0:00 today to 0:00 tomorrow
var startTime = moment();
    startTime.hour(0);
    startTime.minute(0);
    startTime.seconds(0);

var endTime = moment(startTime).add(1, 'd');

// Fetch the calendar data from Google
request({
      uri: "https://www.googleapis.com/calendar/v3/calendars/"+config["calendar-id"]+"/events",
      // Response will be JSON
      json:true,
      // Fudge the "referer" (sic) header so Google will accept the request
      headers: {
        "Referer": "https://srct.gmu.edu"
      },
      // Our search parameters. Basically, events that are meetings that are today.
      qs: {
        "singleEvents": true,
        "orderBy": "startTime",
        "timeMin": startTime.toISOString(),
        "timeMax": endTime.toISOString(),
        "showDeleted": false,
        "maxResults": 1,
        "q": config["event-name"],
        "key": config["public-api-key"]
      }
    }, function(err, res, body) {
      // Only post if there is an event today
      if (body.items.length == 1) {

        // Configure the time string -- based off srct.gmu.edu
        moment.tz.setDefault("America/New_York");
        var timeString = moment.tz(body.items[0].start.dateTime, "Etc/UTC").tz("America/New_York").format("h:mm A")

        // Our meeting location
        var place = body.items[0].location;

        // Pick a random phrase from the lists in our configuration file.
        // Not super important, but makes the bot less botty
        var introPhrase = config["intro-phrases"][Math.floor(Math.random() * config["intro-phrases"].length)];
        var midPhrase = config["mid-phrases"][Math.floor(Math.random() * config["mid-phrases"].length)];
        var endPhrase = config["end-phrases"][Math.floor(Math.random() * config["end-phrases"].length)];

        request.post({
          url: config["slack-hook"],
          body: JSON.stringify({
            "channel": "#"+config["slack-channel"],
            "username": "Meeting Bot",
            "icon_emoji": ":dancing_penguin:",
            "attachments": [
              {
                "fallback": util.format("Meeting today in %s at %s!", place, timeString),
                "color": "#FFCC33",
                "text": util.format("%s\n%s Stop by %s at %s to join the fun!\n%s", 
                  introPhrase,
                  midPhrase,
                  place,
                  timeString,
                  endPhrase
                ),
                "mrkdwn_in": ["text", "pretext", "fields"]
              }
            ]
          })
        }, function(err, res, body) {
          console.log(err);
          console.log(body);
        })
      }
    }
);
