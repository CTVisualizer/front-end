const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const url = require('url');
const request = require('request');
const process = require('process');

let window = null;

app.once('ready', () => {

  process.on('uncaughtException', (error) => {
    console.log(error);
    app.quit();
  });

  window = new BrowserWindow({
    width: 1600,
    height: 1200,
    show: false,
    resizable: true,
    icon: path.join(__dirname, 'res/logo4.png')
  });

  window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  window.once('ready-to-show', () => {
    window.show()
    require("./menu/mainmenu");
  });

  window.on('close', function () {
    try {
      request.delete("http://localhost:8080/kill");
    } catch(err) {
      console.log(err);
    }
    app.quit();
    
  });

  window.on('reload', function () {
    try {
      request.delete("http://localhost:8080/kill");
    } catch(err) {
      console.log(err);
    }
  });
});