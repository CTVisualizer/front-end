const fs = require("fs");
module.exports = (function() { return JSON.parse(fs.readFileSync("./locations.json"))})()