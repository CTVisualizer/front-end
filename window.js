//Node Modules
const Table = require("table-builder");
const request = require("request");
const { spawn } = require('child_process');
const fs = require("fs");
const progress = require('request-progress');
const homedir = require('os').homedir();
const targz = require('targz');

//Front-End Configs
var htmlComponents = require("./htmlComponents.json");
const pathToSettings = "./config/settings.json";
const pathToDriverSettings = "./config/driversettings.json";

//Global Stated Data
var currentComponent = 1; // current component which is being viewed (1=DB visualizer, 2=help, 3=drivermanager, 4=help)
var sqlVisualizerComponent; // current HTML state of the Sql Visualizer component
var currentlyDownloading = false; // is a driver being downloaded
var driverDownloadRequest; // request for downloading drivers (needs to be global)
var connected = false;

// Queries local connection and generates table with results
function generateTable() {
  if (!connected) {
    $("#errorWarning").html(htmlComponents["notConnectedError"]);
  } else {
    clearResults();
    $.getJSON(pathToSettings, function (settingsJson) {
      if (!validateSettingsExist(settingsJson)) {
        $("#errorWarning").html(htmlComponents["incompleteSettingsWarning"]);
      } else {
        $("#errorWarning").html(htmlComponents["emptyErrorWarning"]);
        var preparedQuery = prepareQuery(codeMirrorWindow.getValue());
        if (!preparedQuery) {
          $("#errorWarning").html(htmlComponents["missingQueryError"]);
        } else {
          hideNavbar();
          $("#queryResponse").html("<h3>Executing query...</h3>");
          request('http://localhost:8080/execute/' + preparedQuery, function (error, response, body) {
            resumeNavbar();
            if (error) {
              $("#errorWarning").html(htmlComponents["databaseRequestError"]);
              $("queryResponse").html("<table class='ui celled striped table'></table></div>");
            } else {
              var queryResults = JSON.parse(body);
              console.log(queryResults);
              var headers = buildHeaders(queryResults);
              var data = queryResults['data'];
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
              //$("#resultsText").html(data.length+" Results");
              $('td').addClass(getColorForStatusCode(response.statusCode));
            }
          });
        }
      }
    });
  }
}

function getColorForStatusCode(statusCode) {
  var tableColorsMap = { 550: "negative", 200: "" };
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
  //document.getElementById("#resultsHeader").outerHTML="<h3 id='resultsText'>Results</h3>";
}

function stopQuery() {
  request({
    url: "http://localhost:8080/stop",
    method: "DELETE",
  }, function (error, response, body) {
    if(response.statusCode==200)
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
    if (currentComponent == 1)
      sqlVisualizerComponent = $("#mainComponent").html();
    if (newComponent == 1) { // DB Visualizer
      $("#mainComponent").html(sqlVisualizerComponent);
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

function manageDrivers() {
  updateSettings();
  switchComponent(3);
  populateAvailableDrivers();
  $.getJSON(pathToDriverSettings, function (driverSettingsJson) {
    document.getElementById("activeDriverName").innerHTML = driverSettingsJson["activeDriver"];
  });
  $('.ui.dropdown').dropdown();
}

//CONFIGURATION FUNCTIONS (Settings and Drivers Config field population and config file I/O)
function updateSettings() {
  var newSettingsData = {
    "quorum": "",
    "port": "",
    "hbase-node": "",
    "principal": "",
    "path-to-keytab": ""
  };
  var emptyFieldsExist = false;
  for (var i = 0; i < Object.keys(newSettingsData).length; i++) {
    var enteredField = document.getElementById(Object.keys(newSettingsData)[i]).value;
    newSettingsData[Object.keys(newSettingsData)[i]] = enteredField;
    if (enteredField == "")
      emptyFieldsExist = true;
  }
  fs.writeFile(pathToSettings, JSON.stringify(newSettingsData), function (err) {
    if (err)
      $("#errorWarning").html(htmlComponents["updateSettingsError"]);
    else if (emptyFieldsExist)
      $("#errorWarning").html(htmlComponents["updateSettingsEmptyWarning"]);
    else
      $("#errorWarning").html(htmlComponents["updateSettingsSuccess"]);
  });
}

function populateSettingsFields() {
  $.getJSON(pathToSettings, function (settingsJson) {
    for (var i = 0; i < Object.keys(settingsJson).length; i++) {
      document.getElementById(Object.keys(settingsJson)[i]).value = settingsJson[Object.keys(settingsJson)[i]];
    }
    $.getJSON(pathToDriverSettings, function (driverSettingsJson) {
      document.getElementById("driver-version").innerHTML = driverSettingsJson["activeDriver"];
    });
  });
}

function populateAvailableDrivers() {
  var driverLocation = homedir + "/.ctvisualizer/";
  var arrayOfDrivers = [];
  if (!fs.existsSync(driverLocation)) {
    fs.mkdirSync(driverLocation);
  }
  fs.readdirSync(driverLocation).forEach(file => {
    if(file.substr(file.length - 4) == ".jar")
      arrayOfDrivers.push({ "name": file, "value": file });
  });
  $('.ui.dropdown').dropdown({ // populate dropdown
    values: arrayOfDrivers
  });
}

function updateActiveDriver() {
  $.getJSON(pathToDriverSettings, function (driverSettingsJson) {
    var newActiveDriver = document.getElementsByClassName("item active selected")[0].innerHTML;
    var newDriverData = '{ "activeDriver" : "' + newActiveDriver + '"}';
    var newDriverJson = JSON.parse(JSON.stringify(newDriverData));
    fs.writeFile(pathToDriverSettings, newDriverJson, function (err) {
      if (err)
        console.log(err);
      else {
        document.getElementById("activeDriverName").innerHTML = newActiveDriver;
        $("#driverErrorWarning").html(htmlComponents["activeDriverUpdatedComponet"]);
      }
    });
  });
}

function downloadDriver() { // process for downloading a new driver
  if (!currentlyDownloading) {
    currentlyDownloading = true;
    var fileToDownload = document.getElementById('driverToDownload').value;
    if (!fileToDownload || !fileToDownload.toLowerCase().includes("apache-phoenix") || !fileToDownload.toLowerCase().includes("-bin.tar.gz")) {
      document.getElementById("downloadProgress").outerHTML = htmlComponents["invalidDriverErrorMessage"];
      currentlyDownloading = false;
    } else {
      var writePath = homedir + "/.ctvisualizer/" + fileToDownload;
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
    src: homedir+"/.ctvisualizer/"+fileToExtract,
    dest: homedir+"/.ctvisualizer/"+outputDirectoryName,
  }, function (err) {
    if (err) {
      console.log("Error extracting jar");
      downloadEnded();
    } else {
      document.getElementById("downloadProgress").outerHTML = "<h3 id='downloadProgress'>Locating extracted jar...</h3>";
      copyJarFile(homedir+"/.ctvisualizer/"+outputDirectoryName+"/"+outputDirectoryName+"/"+outputDirectoryName.replace("bin", "client.jar").replace("apache-",""), homedir+"/.ctvisualizer/"+outputDirectoryName.replace("bin", "client.jar").replace("apache-",""));
    }
  });
}

function copyJarFile(source, target) {
  var readStream = fs.createReadStream(source);
  readStream.on("error", function(err) {
    console.log("Read extracted file error: "+err);
    downloadEnded();
  });
  var writeStream = fs.createWriteStream(target);
  writeStream.on("error", function(err) {
    console.log("File write error: "+err);
    downloadEnded();
  });
  writeStream.on("close", function(ex) {
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

// PHOENIX CONNECTION
function createConnection() {
  document.getElementById("connectButton").outerHTML = htmlComponents["connectingButton"];
  hideNavbar();

  $.getJSON(pathToSettings, function (settingsJson) {
    $.getJSON(pathToDriverSettings, function (driverSettingsJson) {

      var shellScript = spawn('./phoenix-adapter/bin/phoenix-adapter',
        [
          '-quorum=' + settingsJson["quorum"],
          '-port=' + settingsJson["port"],
          '-hbaseNode=' + settingsJson["hbase-node"],
          '-principal=' + settingsJson["principal"],
          '-phoenixClient=' + homedir + "/.ctvisualizer/" + driverSettingsJson["activeDriver"],
          '-keytab=' + settingsJson["path-to-keytab"]
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
    });
  });
}

function connectionSuccess() {
  connected = true;
  document.getElementById("dbConnectionStatus").outerHTML = htmlComponents["connectionActiveStatus"];
  document.getElementById("connectButton").outerHTML = htmlComponents["killConnectionButton"];
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