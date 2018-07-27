
const fs = require('fs');

const appdataDirectory = require('./appdata-directory');
const locations = require('./locations');
const maxHistoryLength = 20;

const pathToQueryHistoryFile = appdataDirectory.getDirectory() + locations.pathToQueryHistoryFile;

function createQueryHistoryFileIfNotExists() {
    if(!fs.existsSync(pathToQueryHistoryFile)) {
        createQueryHistoryFile();
    }
}

function createQueryHistoryFile() {
    console.log("Creating query history file at " + pathToQueryHistoryFile);
    appdataDirectory.createIfNotExists();
    const initialValue = [];
    fs.writeFileSync(pathToQueryHistoryFile, JSON.stringify(initialValue));
    console.log("query history file created.");
}

function writeQueryHistory(newQueryHistory) {
    if(Array.isArray(newQueryHistory)) {
        console.log("Writing new query history at " + pathToQueryHistoryFile);
        fs.writeFileSync(pathToQueryHistoryFile, JSON.stringify(newQueryHistory));
        console.log("new query history written.");
    } else {
        console.log("newQueryHistory is not of type Array. Make sure the new query history is an array of queries.");
    }
}

function getHistory () {
    createQueryHistoryFileIfNotExists();
    return JSON.parse(fs.readFileSync(pathToQueryHistoryFile));
}

module.exports.getHistory = getHistory;

module.exports.pushQuery = function (query, results) {
    createQueryHistoryFileIfNotExists();
    var history = getHistory();
    var newEntry = {"query": query, "results": results}
    let newHistoryLength = history.unshift(newEntry);
    if(newHistoryLength > maxHistoryLength) {
        writeQueryHistory(history.slice(0, maxHistoryLength));
    } else {
        writeQueryHistory(history);
    }
}

module.exports.getMaxHistoryLength = function () {return maxHistoryLength};