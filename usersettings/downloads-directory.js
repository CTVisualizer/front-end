

const fs = require("fs");
const appdataDirectory = require("./appdata-directory");
const locations = require("./locations");

const pathToPhoenixDownloads = appdataDirectory.getDirectory() + locations.pathToPhoenixDownloads;

function createDownloadsDirectoryIfNotExists() {
    if(!fs.existsSync(pathToPhoenixDownloads)) {
        createDownloadsDirectory();
    }
}

function createDownloadsDirectory() {
    console.log("Creating phoenix downloads directory at " + pathToPhoenixDownloads);
    appdataDirectory.createIfNotExists();
    fs.mkdirSync(pathToPhoenixDownloads);
    console.log("downloads directory created.");
}

module.exports.getDirectory = function () {
    createDownloadsDirectoryIfNotExists();
    return pathToPhoenixDownloads;
}