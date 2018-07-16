const {app, BrowserWindow, ipcRenderer} = require("electron");
const path = require("path");

  // Keep a global reference of the window object, if you don"t, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let win;
  
  function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, "img/ralph.png")
    });
  
    // and load the index.html of the app.
    win.loadFile("index.html");
  
    // Open the DevTools.
    win.webContents.openDevTools();
  
    // Emitted when the window is closed.
    win.on("closed", () => {
      win = null;
    });
  }
  
  app.on("ready", createWindow);
  
  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  
  app.on("activate", () => {
    // On macOS it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
  
  // In this file you can include the rest of your app"s specific main process
  // code. You can also put them in separate files and require them here.