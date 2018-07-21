const fs = require("fs");
const locations = require("./locations");
const configDirectory = require("./config-directory");
const appdataDirectory = require("./appdata-directory");
const pathToDriverSettingsFile = appdataDirectory.getDirectory() + locations["pathToDriverSettingsFile"];


function createSettingsFile() {
    console.log("Creating driversettings file at "+ pathToDriverSettingsFile);
    const initialValue = { "activeDriver" : "No driver selected" };
    fs.writeFileSync(pathToDriverSettingsFile, JSON.stringify(initialValue));
    console.log("driversettings file created.");
}

function createSettingsFileIfNotExists() {
    if (!fs.existsSync(pathToDriverSettingsFile)) {
        configDirectory.createIfNotExists();
        createSettingsFile();
    }
}

module.exports.getActiveDriver = function () {
    createSettingsFileIfNotExists();
    let driverSettings = JSON.parse(fs.readFileSync(pathToDriverSettingsFile));
    return driverSettings.activeDriver;
}

module.exports.setActiveDriver = function (newActiveDriver) {
    createSettingsFileIfNotExists();
    console.log("Setting active driver to: " + newActiveDriver);
    let driverSettings = JSON.parse(fs.readFileSync(pathToDriverSettingsFile));
    driverSettings.activeDriver = newActiveDriver;
    fs.writeFileSync(pathToDriverSettingsFile, JSON.stringify(driverSettings));
    console.log("active driver set.");
}
