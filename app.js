const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');


let window = null;

app.once('ready', () => {
  window = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    resizable: true
  });

  window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  window.once('ready-to-show', () => {
    window.show()
  });
});


//TEST SERVER FOR JSON RESPONSE
const express = require('express');
const server = express();

server.get('/execute', function (req, res) {
    if (req.query.query){
      var simpleJson = 
      { 
          'metadata': 
              { 'columns': 
                  [ 
                      { 'name': 'description', 'type': 'VARCHAR' }, 
                      { 'name': 'event_time', 'type': 'DATE' }, 
                      { 'name': 'notable', 'type': 'BOOLEAN' }, 
                      { 'name': 'verticals', 'type': 'VARCHAR ARRAY'},
                      { 'name': 'threat', 'type' : 'VARCHAR'}
                  ]
              }, 
          'data': 
              [
                  { 'description': 'THIS IS A TEST', 'event_time': '2017-08-22 18:11:16.0', 'notable': true, 'verticals': ['cool', 'beans'], 'threat': 'bademail@gmail.com'},
                  { 'description': 'here is another description', 'event_time': '2018-03-12 08:00:23.5', 'notable': false, 'verticals': ['some', 'verticals'], 'threat' : 'badwebsite.com' }
              ]
      };
      res.send(simpleJson);
    } else {
      res.send("Please send a query with your request");
    }
});

server.listen('3000', () => {
  console.log('Server started on port 3000');
});