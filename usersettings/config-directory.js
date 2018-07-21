
const fs = require("fs");
const appdataDirectory = require("./appdata-directory");
const configDirectory = appdataDirectory.getDirectory() + "config/";

module.exports.createIfNotExists = function () {
    if (!fs.existsSync(configDirectory)) {
        createDirectory();
    }
}

function createDirectory() {
    console.log("Creating config directory at " + configDirectory);
    appdataDirectory.createIfNotExists();
    fs.mkdirSync(configDirectory);
    console.log("config directory created.");
}
