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
