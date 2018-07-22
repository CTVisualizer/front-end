
const fs = require("fs");
const appdataDirectory = require("./appdata-directory");
const locations = require("./locations");

const pathToDriverJars = appdataDirectory.getDirectory() + locations.pathToDriverJars;

function createDriversDirectoryIfNotExists() {
    if(!fs.existsSync(pathToDriverJars)) {
        createDriversDirectory();
    }
}

function createDriversDirectory() {
    console.log("Creating drivers directory at " + pathToDriverJars);
    appdataDirectory.createIfNotExists();
    fs.mkdirSync(pathToDriverJars);
    console.log("drivers directory created.");
}

module.exports.getDirectory = function () {
    createDriversDirectoryIfNotExists();
    return pathToDriverJars;
}