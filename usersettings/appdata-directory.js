
const fs = require("fs");
const locations = require("./usersettings/locations");
const appDataDirectory = (function () {return os.homedir() + locations["ctvisualizer"]})();


module.exports.getDirectory = function (){ return appDataDirectory };

module.exports.createIfNotExists = function (){
    if (!fs.existsSync(appDataDirectory)) {
        createDirectory();
    }
}

function createDirectory() {
    console.log("Creating appdata directory at " + appDataDirectory);
    fs.mkdirSync(appDataDirectory);
    console.log("appdata directory created.");
}