'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Trello = require('node-trello');
var trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

var slack_token = process.env.SLACK_TOKEN;

var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

/**
 *  Send the card to trello
 */

function postToTrello(listId, command, text, user_name, cb) {
  if (text == undefined || text == null || text == "") {
    throw new Error('Format is ' + command + ' name | description(optional)');
  }

  var name_and_desc = text.split('|');

  if (!name_and_desc.length) throw new Error('Format is ' + command + ' name | description(optional)');

	var card_data = {
		'name' : name_and_desc.shift() + ' (@' + user_name + ')',
		'desc' : name_and_desc.shift()
	};

	trello.post('/1/lists/' + listId + '/cards', card_data, cb);
};

app.post('/*', function(req, res, next) {
  var listId = req.params[0];
  var command = req.body.command;
  var text = req.body.text;
  var user_name = req.body.user_name;
  var token = req.body.token;

  if (token !== slack_token) return next(new Error('Slack token and slack ENV token do not match'));

  postToTrello(listId, command, text, user_name, function(err, data) {
    if (err) throw err;

    var name = data.name;
    var url = data.shortUrl;

    res.status(200).send('Card "' + name + '" created here: <' + url + '>');
  });
});

// test route
app.get('/', function (req, res) { res.status(200).send('The server is up and running!') });

// error handler
app.use(function (err, req, res, next) {
  err = err || new Error('There was an application error');
  console.error(err.stack);
  res.status(400).send('Error: ' + err.message);
});

app.listen(port, function () {
  console.log('Started Slack-To-Trello ' + port);
});
