
const fs = require("fs");
const appdataDirectory = require("./appdata-directory");
const configDirectory = require("./config-directory");
const locations = require("./locations");
const pathToPhoenixSettingsFile = appdataDirectory.getDirectory() + locations.pathToPhoenixSettingsFile;

function createSettingsFile() {
    console.log("Creating phoenix settings file at " + pathToPhoenixSettingsFile);
    configDirectory.createIfNotExists();
    const initialValue = {
        "quorum": "",
        "port": "",
        "hbaseNode": "",
        "principal": "",
        "pathToKeytab": ""
    };
    fs.writeFileSync(pathToPhoenixSettingsFile, JSON.stringify(initialValue));
    console.log("phoenix settings file created.");
}

function createSettingsFileIfNotExists() {
    if(!fs.existsSync(pathToPhoenixSettingsFile)) {
        createSettingsFile();
    }
}

function valid(settings) {
    return (settings && 
        settings.hasOwnProperty("quorum") && 
        settings.hasOwnProperty("port") && 
        settings.hasOwnProperty("hbaseNode") && 
        settings.hasOwnProperty("principal") && 
        settings.hasOwnProperty("pathToKeytab"));
}

module.exports.getSettings = function() {
    createSettingsFileIfNotExists();
    return JSON.parse(fs.readFileSync(pathToPhoenixSettingsFile));
}

module.exports.saveSettings = function(settings) {
    createSettingsFileIfNotExists();
    if (valid(settings)) {
        console.log("Saving phoenix settings to " + pathToPhoenixSettingsFile);
        fs.writeFileSync(pathToPhoenixSettingsFile, JSON.stringify(settings));
        console.log("phoenix settings saved.")
    } else {
        console.log("Settings are invalid. Make sure all required keys are present.")
    }
}

module.exports.deleteSettings = function() {
    console.log("Deleting phoenix settings file at " + pathToPhoenixSettingsFile);
    fs.unlinkSync(pathToPhoenixSettingsFile);
    console.log("phoenix settings file deleted");
}