// Node Modules
const Table = require("table-builder");
const request = require("request");
const { spawn } = require('child_process');
const fs = require("fs");
const progress = require('request-progress');
const homedir = require('os').homedir();
const targz = require('targz');
const path = require('path');

// Local Modules
const activeDriverManager = require('./usersettings/active-driver-manager');
const phoenixSettingsManager = require('./usersettings/phoenix-settings-manager');
const queryHistoryManager = require('./usersettings/query-history-manager');

const driversDirectory = require('./usersettings/drivers-directory');
const downloadsDirectory = require('./usersettings/downloads-directory');

// Local JSON
var htmlComponents = require("./htmlComponents.json");

// Global Stated Data
var currentComponent = 1; // current component which is being viewed (1=DB visualizer, 2=help, 3=drivermanager, 4=help)
var sqlVisualizerComponent; // current HTML state of the Sql Visualizer component
var currentlyDownloading = false; // is a driver being downloaded
var driverDownloadRequest; // request for downloading drivers (needs to be global)
var connected = false;
var codeMirrorWindow;
var currentQuery;
var queryResults;
var currentQueryIndex = 0;

$(document).ready(function () { // on document ready, populate query window with most recent query
  let queryHistoryJson = queryHistoryManager.getHistory()
  if (currentQueryIndex != queryHistoryManager.getMaxHistoryLength() - 1 && queryHistoryJson[0] != undefined) {
    codeMirrorWindow.setValue(queryHistoryJson[0]);
    currentQueryIndex = 0;
  }
  colorHistoryArrows();
});

// Queries local connection and generates table with results
function generateTable() {
  if (!connected) {
    $("#errorWarning").html(htmlComponents["notConnectedError"]);
  } else {
    clearResults();
    if (!validateSettingsExist(phoenixSettingsManager.getSettings())) {
      $("#errorWarning").html(htmlComponents["incompleteSettingsWarning"]);
    } else {
      $("#errorWarning").html(htmlComponents["emptyErrorWarning"]);
      var rawQuery = codeMirrorWindow.getValue();
      var preparedQuery = prepareQuery(rawQuery);
      if (!preparedQuery) {
        $("#errorWarning").html(htmlComponents["missingQueryError"]);
      } else {
        hideNavbar();
        $("#queryResponse").html("<h3>Executing query...</h3>");
        document.getElementById('runIcon').outerHTML = "<i class='spinner loading icon' id='runIcon'></i>";
        request('http://localhost:8080/execute/' + preparedQuery, function (error, response, body) {
          updateQueryHistory(rawQuery);
          resumeNavbar();
          document.getElementById('runIcon').outerHTML = "<i class='play icon' id='runIcon'></i>";
          if (error) {
            $("#errorWarning").html(htmlComponents["databaseRequestError"]);
            $("queryResponse").html("<table class='ui celled striped table'></table></div>");
          } else {
            console.log(body);
            queryResults = JSON.parse(body);
            var headers = buildHeaders(queryResults);
            var data = queryResults['data'];
            if (data.length > 100) {
              var firstHundredData = data.slice(0, 101);
              var dataForTable = firstHundredData;
            } else {
              var dataForTable = data;
            }
            var tableHtml = (
              (new Table({
                "class": "ui fixed single line celled table selectable compact",
                "id": "queryResponse",
                "style": "overflow-x:auto"
              }))
                .setHeaders(headers)
                .setData(dataForTable)
                .render()
            );
            $("#queryResponse").html(tableHtml);
            stylePrimaryKeys(queryResults);
            document.getElementById("numberOfResults").innerHTML = data.length + " Results";
            if (data.length == 1)
              document.getElementById("numberOfResults").innerHTML = "1 Result";
            if (data.length > 100) {
              document.getElementById("expandTableOption").outerHTML = "<button class='ui button mini blue' id='expandTableOption' onclick='expandTableResults()'>Display all results</button>"
              document.getElementById("numberOfResults").innerHTML = data.length + " Results (Showing 100)";
            }
            $('td').addClass(getColorForStatusCode(response.statusCode));
          }
        });
      }
    }
  }
}

function expandTableResults() {
  var data = queryResults['data'];
  var headers = buildHeaders(queryResults);
  var tableHtml = (
    (new Table({
      "class": "ui fixed single line celled table selectable compact",
      "id": "queryResponse",
      "style": "overflow-x:auto"
    }))
      .setHeaders(headers)
      .setData(data)
      .render()
  );
  $("#queryResponse").html(tableHtml);
  stylePrimaryKeys(queryResults);
  document.getElementById("expandTableOption").outerHTML = "<div id='expandTableOption'></div>"
  document.getElementById("numberOfResults").innerHTML = data.length + " Results";
  if (data.length == 1)
    document.getElementById("numberOfResults").innerHTML = "1 Result";
}

function stylePrimaryKeys(queryResults) {
  if (!queryResults['metadata']['multipleTablesRepresented']) {
    for (var i = 0; i < queryResults['metadata']['primaryKeys'].length; i++) { // add key icon to primary key headers
      var primaryKey = queryResults['metadata']['primaryKeys'][i]['name'];
      $("th").each(function (index) {
        if ($(this).text() == primaryKey) {
          $(this).html($(this).html() + " <i style='font-size:10px' class='gray key icon'><i>");
        }
      });
    }
  }
}

function getColorForStatusCode(statusCode) {
  var tableColorsMap = { 550: "negative", 200: "", 202: "positive" };
  if (tableColorsMap[statusCode] != undefined)
    return tableColorsMap[statusCode];
  else
    return "";
}

function prepareQuery(query) {
  query = query.trim();
  var terminalCharacter = query.substr((query.length - 1) - (query.length));
  if (terminalCharacter == ";") {
    query = query.substr(0, query.length - 1);
  }
  return encodeURIComponent(query);
}

function buildHeaders(queryResults) {
  var headers = [];
  for (var i = 0; i < queryResults["metadata"]["columns"].length; i++) {
    var newHeader = (queryResults["metadata"]["columns"][i]["name"]);
    headers.push([newHeader, newHeader]);
  }
  return headers;
}

function clearResults() {
  $("#queryResponse").html("<table></table>");
  $("#errorWarning").html(htmlComponents["emptyErrorWarning"]);
  document.getElementById("numberOfResults").innerHTML = "";
  document.getElementById("expandTableOption").outerHTML = '<div id="expandTableOption"></div>';
}

function stopQuery() {
  request({
    url: "http://localhost:8080/stop",
    method: "DELETE",
  }, function (error, response, body) {
    if (response.statusCode == 200)
      resumeNavbar();
  });
}

function validateSettingsExist(settingsJson) {
  for (var key in settingsJson) {
    if (settingsJson[key] == "") {
      return false;
    }
  }
  return true;
}

//COMPONENT-RELATED FUNCTIONS
function switchComponent(newComponent) {
  if (!currentlyDownloading) {
    if (currentComponent == 1) {
      currentQuery = codeMirrorWindow.getValue();
      $(".CodeMirror").remove();
      codeMirrorWindow = "";
      sqlVisualizerComponent = $("#mainComponent").html();
    }
    if (newComponent == 1) { // DB Visualizer
      $("#mainComponent").html(sqlVisualizerComponent);
      codeMirrorWindow = CodeMirror.fromTextArea(document.getElementById("queryInput"), {
        lineNumbers: true,
        mode: "text/x-sql"
      });
      codeMirrorWindow.setValue(currentQuery);
    } else if (newComponent == 2) { // Settings
      $("#mainComponent").html(htmlComponents["settingsComponent"]);
      populateSettingsFields();
    } else if (newComponent == 3) { // Driver manager
      $("#mainComponent").html(htmlComponents["driverManagerComponent"]);
    } else if (newComponent == 4) { // Help
      $("#mainComponent").html(htmlComponents["helpComponent"]);
    }
    currentComponent = newComponent;
  }
}

function hideNavbar() {
  document.getElementById("navbar").outerHTML = htmlComponents["emptyNavbarComponent"];
}

function resumeNavbar() {
  document.getElementById("navbar").outerHTML = htmlComponents["navbarComponent"];
}

function backwardQuery() {
  let queryHistoryJson = queryHistoryManager.getHistory();
  if (currentQueryIndex != 0 && queryHistoryJson[currentQueryIndex - 1] != undefined) {
    currentQueryIndex--;
    var currentQueryText = queryHistoryJson[currentQueryIndex];
    codeMirrorWindow.setValue(currentQueryText);
    colorHistoryArrows();
  }
}

function forwardQuery() {
  let queryHistoryJson = queryHistoryManager.getHistory();
  if (currentQueryIndex != queryHistoryManager.getMaxHistoryLength() - 1 && queryHistoryJson[currentQueryIndex + 1] != undefined) {
    currentQueryIndex++;
    var currentQueryText = queryHistoryJson[currentQueryIndex];
    codeMirrorWindow.setValue(currentQueryText);
    colorHistoryArrows();
  }
}

function colorHistoryArrows() {
  let queryHistoryJson = queryHistoryManager.getHistory();
  if (currentQueryIndex == queryHistoryManager.getMaxHistoryLength() - 1 || queryHistoryJson[currentQueryIndex + 1] == undefined) {
    $('#forwardArrow').removeClass('primary');
  }
  else {
    $('#forwardArrow').addClass('primary');
  }
  if (currentQueryIndex == 0 || queryHistoryJson[currentQueryIndex - 1] == undefined) {
    $('#backArrow').removeClass('primary');
  }
  else {
    $('#backArrow').addClass('primary');
  }
}

function manageDrivers() {
  updateSettings();
  switchComponent(3);
  populateAvailableDrivers();
  document.getElementById("activeDriverName").innerHTML = activeDriverManager.getActiveDriver()
  $('.ui.dropdown').dropdown();
}

//CONFIGURATION FUNCTIONS (Settings and Drivers Config field population and config file I/O)
function updateSettings() {
  var newSettingsData = {
    "quorum": "",
    "port": "",
    "hbaseNode": "",
    "principal": "",
    "pathToKeytab": ""
  };
  var emptyFieldsExist = false;
  for (var i = 0; i < Object.keys(newSettingsData).length; i++) {
    var enteredField = document.getElementById(Object.keys(newSettingsData)[i]).value;
    newSettingsData[Object.keys(newSettingsData)[i]] = enteredField;
    if (enteredField == "")
      emptyFieldsExist = true;
  }
  phoenixSettingsManager.saveSettings(newSettingsData);
  if (emptyFieldsExist)
    $("#errorWarning").html(htmlComponents["updateSettingsEmptyWarning"]);
  else
    $("#errorWarning").html(htmlComponents["updateSettingsSuccess"]);
}

function populateSettingsFields() {
  const settingsJson = phoenixSettingsManager.getSettings();
  for (var i = 0; i < Object.keys(settingsJson).length; i++) {
    document.getElementById(Object.keys(settingsJson)[i]).value = settingsJson[Object.keys(settingsJson)[i]];
  }
  document.getElementById("driver-version").innerHTML = activeDriverManager.getActiveDriver();
}

function populateAvailableDrivers() {
  var driverLocation = driversDirectory.getDirectory();
  var arrayOfDrivers = [];
  fs.readdirSync(driverLocation).forEach(file => {
    if (file.substr(file.length - 4) == ".jar")
      arrayOfDrivers.push({ "name": file, "value": file });
  });
  $('.ui.dropdown').dropdown({ // populate dropdown
    values: arrayOfDrivers
  });
}

function updateActiveDriver() {
  var newActiveDriver = document.getElementsByClassName("item active selected")[0].innerHTML;
  document.getElementById("activeDriverName").innerHTML = newActiveDriver;
  activeDriverManager.setActiveDriver(newActiveDriver);
}

function downloadDriver() { // process for downloading a new driver
  if (!currentlyDownloading) {
    currentlyDownloading = true;
    var fileToDownload = document.getElementById('driverToDownload').value;
    if (!fileToDownload || !fileToDownload.toLowerCase().includes("apache-phoenix") || !fileToDownload.toLowerCase().includes("-bin.tar.gz")) {
      document.getElementById("downloadProgress").outerHTML = htmlComponents["invalidDriverErrorMessage"];
      currentlyDownloading = false;
    } else {
      var writePath = downloadsDirectory.getDirectory() + fileToDownload;
      var downloadPath = getPhoenixDownloadPath(fileToDownload);
      var currentDownloadPercent = 0;
      var ouputFile = fs.createWriteStream(writePath);

      hideNavbar();
      document.getElementById("downloadSpinner").outerHTML = htmlComponents["downloadSpinnerIcon"];
      document.getElementById("endDownloadButton").outerHTML = htmlComponents["endDownloadButton"];
      document.getElementById("downloadProgress").outerHTML = htmlComponents["emptyDownloadProgress"];

      driverDownloadRequest = progress(request.get(downloadPath));

      driverDownloadRequest.on('progress', state => {
        currentDownloadPercent = (state["percent"] * 100).toFixed(2);
        var currentDownloadedBytes = state["size"]["transferred"];
        var totalDownloadSize = state["size"]["total"];
        var updateMessage = "<h3 id='downloadProgress'> Download Progress: " + currentDownloadedBytes + "/" + totalDownloadSize + " (" + currentDownloadPercent + "%) </h3>";
        document.getElementById("downloadProgress").outerHTML = updateMessage;
      });

      driverDownloadRequest.on('response', function (response) {
        if (response.statusCode == 404) {
          document.getElementById("downloadProgress").outerHTML = htmlComponents["driverDownloadFailedMessage"];
          downloadEnded();
        }
      });

      driverDownloadRequest.on('error', function (err) {
        fs.unlink(writePath);
        document.getElementById("downloadSpinner").outerHTML = "<i class='icon download' id='downloadSpinner'></i>";
        console.log(err);
        downloadEnded();
      });

      driverDownloadRequest.pipe(ouputFile);

      ouputFile.on('finish', function () {
        ouputFile.close();
        if (currentDownloadPercent > 85) { // Pretty hacky, could be changed later if time allows... Keeps track of whether download completed successfully by ensuring current % was greater than 85 at download completion
          document.getElementById("downloadProgress").outerHTML = "<h3 id='downloadProgress'>Unpacking files...</h3>";
          extractJar(fileToDownload);
        }
        else {
          fs.unlinkSync(writePath);
          downloadEnded();
        }
      });

      ouputFile.on('error', function (err) {
        fs.unlink(writePath);
        document.getElementById("downloadProgress").outerHTML = htmlComponents["driverDownloadFailedMessage"];
        downloadEnded();
      });
    }
  }
}


function extractJar(fileToExtract) {
  var outputDirectoryName = fileToExtract.replace(".tar.gz", "");
  targz.decompress({
    src: downloadsDirectory.getDirectory() + fileToExtract,
    dest: downloadsDirectory.getDirectory() +  outputDirectoryName,
  }, function (err) {
    if (err) {
      console.log("Error extracting jar");
      downloadEnded();
    } else {
      document.getElementById("downloadProgress").outerHTML = "<h3 id='downloadProgress'>Locating extracted jar...</h3>";
      copyJarFile(downloadsDirectory.getDirectory() + outputDirectoryName + "/" + outputDirectoryName + "/" + outputDirectoryName.replace("bin", "client.jar").replace("apache-", ""), driversDirectory.getDirectory() + outputDirectoryName.replace("bin", "client.jar").replace("apache-", ""));
    }
  });
}

function copyJarFile(source, target) {
  var readStream = fs.createReadStream(source);
  readStream.on("error", function (err) {
    console.log("Read extracted file error: " + err);
    downloadEnded();
  });
  var writeStream = fs.createWriteStream(target);
  writeStream.on("error", function (err) {
    console.log("File write error: " + err);
    downloadEnded();
  });
  writeStream.on("close", function (ex) {
    document.getElementById("downloadProgress").outerHTML = "<h3 id='downloadProgress'>Successfully extracted jar. New driver is available for use.</h3>";
    downloadEnded();
    populateAvailableDrivers();
  });
  readStream.pipe(writeStream);
}


function getPhoenixDownloadPath(fileName) { // returns something like "http://archive.apache.org/dist/phoenix/apache-phoenix-4.13.2-cdh5.11.2/bin/apache-phoenix-4.13.2-cdh5.11.2-bin.tar.gz"
  trimmedFileInformation = fileName.substring(0, fileName.length - 11); // cut out the last 11 characters (-bin.tar.gz)
  var fullDownloadPath = "http://archive.apache.org/dist/phoenix/" + trimmedFileInformation + "/bin/" + trimmedFileInformation + "-bin.tar.gz";
  return fullDownloadPath;
}

function quitDownload() { // download terminated manually
  driverDownloadRequest.abort();
  document.getElementById("downloadProgress").outerHTML = "<h3 id='downloadProgress'>Download was terminated</h3>";
  downloadEnded();
}

function downloadEnded() { // any time a download ends
  document.getElementById("downloadSpinner").outerHTML = "<i class='icon download' id='downloadSpinner'></i>";
  document.getElementById("endDownloadButton").outerHTML = "<div id='endDownloadButton'></div>";
  resumeNavbar();
  populateAvailableDrivers();
  currentlyDownloading = false;
}

function updateQueryHistory(newQuery) {
  queryHistoryManager.pushQuery(newQuery);
  currentQueryIndex = 0;
  colorHistoryArrows();
}

// PHOENIX CONNECTION
function createConnection() {
  document.getElementById("connectButton").outerHTML = htmlComponents["connectingButton"];
  hideNavbar();
  let settingsJson = phoenixSettingsManager.getSettings();
  if (!validateSettingsExist(settingsJson)) {
    connectionFailed();
    $("#errorWarning").html(htmlComponents["incompleteSettingsWarning"]);
  } else {
    var shellScript = spawn(path.join(__dirname, 'node_modules', 'phoenix-java-adapter', 'bin', 'phoenix-adapter'),
      [
        '-quorum=' + settingsJson["quorum"],
        '-port=' + settingsJson["port"],
        '-hbaseNode=' + settingsJson["hbaseNode"],
        '-principal=' + settingsJson["principal"],
        // TODO: Modularize
        '-phoenixClient=' + driversDirectory.getDirectory() + activeDriverManager.getActiveDriver(),
        '-keytab=' + settingsJson["pathToKeytab"]
      ]
    );

    shellScript.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    shellScript.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    shellScript.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });

    // continiously try a health check until success or 10 seconds pass
    var attempts = 0;
    var requestLoop = setInterval(function () {
      request({
        url: "http://localhost:8080/health",
        method: "GET",
      }, function (error, response, body) {
        if (attempts == 10) {
          clearInterval(requestLoop);
          connectionFailed();
          $("#errorWarning").html(htmlComponents["connectionFailedWarning"]);
        }
        else if (!error && response.statusCode == 200) {
          console.log('Connection successful!');
          clearInterval(requestLoop);
          connectionSuccess();
        } else {
          console.log('Connection attempt failed. Attempts (out of 10): ' + attempts);
        }
        attempts++;
      });
    }, 1000);
  }
}


function connectionSuccess() {
  connected = true;
  document.getElementById("dbConnectionStatus").outerHTML = htmlComponents["connectionActiveStatus"];
  document.getElementById("connectButton").outerHTML = htmlComponents["killConnectionButton"];
  $("#errorWarning").html(htmlComponents["emptyErrorWarning"]);
  resumeNavbar();
}

function connectionFailed() {
  connected = false;
  console.log("Gave up on trying to make the connection...");
  document.getElementById("connectButton").outerHTML = htmlComponents["defaultConnectButton"];
  resumeNavbar();
}

function killConnection() {
  request({
    url: "http://localhost:8080/kill",
    method: "DELETE",
  }, function (error, response, body) {
    $("#dbConnectionStatus").html("<h4 id='dbConnectionStatus' style='color: red'>No active connection</h4>");
    document.getElementById("connectButton").outerHTML = htmlComponents["defaultConnectButton"];
    connected = false;
    console.log("Connection killed");
  });
}