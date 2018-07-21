
const fs = require("fs");
const appdataDirectory = require("./appdata-directory");
const locations = require("./locations");

const pathToDrivers = appdataDirectory.getDirectory() + locations.pathToDriverDownloads;

function createDriversDirectoryIfNotExists() {
    if(!fs.existsSync(pathToDrivers)) {
        createDriversDirectory();
    }
}

function createDriversDirectory() {
    console.log("Creating drivers directory at " + pathToDrivers);
    appdataDirectory.createIfNotExists();
    fs.mkdirSync(pathToDrivers);
    console.log("drivers directory created.");
}

module.exports.getDirectory = function () {
    createDriversDirectoryIfNotExists();
    return pathToDrivers;
}