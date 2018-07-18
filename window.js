//Node Modules
const connorModule = require("./connorModule.js");
const Table = require("table-builder");
const request = require("request");
//const child_process = require('child_process');
const fs = require("fs");
const progress = require('request-progress');

//Front-End Configs
var htmlComponents = require("./htmlComponents.json");
const pathToSettings = "./config/settings.json";
const pathToDriverSettings = "./config/driversettings.json";

//Component state Data
var currentComponent = 1; // current component which is being viewed (1=DB visualizer, 2=help, 3=drivermanager, 4=help)
var sqlVisualizerComponent; // current HTML state of the Sql Visualizer component

// MIDDLEWARE FUNCTIONS
function generateTable() {
  clearResults();
  $.getJSON(pathToSettings, function (settingsJson) {
    if (!validateSettingsExist(settingsJson)) {
      $("#errorWarning").html(htmlComponents["incompleteSettingsWarning"]);
    } else {
      $("#errorWarning").html(htmlComponents["emptyErrorWarning"]);
      var query = document.getElementById("queryInput").value;
      if (!query) {
        $("#errorWarning").html(htmlComponents["missingQueryError"]);
      } else {
        request('http://localhost:3000/execute?query=' + query, function (error, response, body) {
          if (error) {
            $("#errorWarning").html(htmlComponents["databaseRequestError"]);
          } else {
            var queryResults = JSON.parse(body);
            var headers = buildHeaders(queryResults);
            var data = queryResults['data'];
            var tableHtml = (
              (new Table({
                "class": "ui fixed single line celled table",
                "id": "queryResponse",
                "style": "overflow-x:auto"
              }))
              .setHeaders(headers)
              .setData(data)
              .render()
            );
            $("#queryResponse").html(tableHtml);
          }
        });
      }
    }
  });
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
}

function stopQuery() {
  clearResults();
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

function manageDrivers() {
  updateSettings();
  switchComponent(3);
  populateAvailableDrivers();
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
  $.getJSON(pathToDriverSettings, function (driverSettingsJson) {
    document.getElementById("activeDriverName").innerHTML = driverSettingsJson["activeDriver"];
    var downloadedDrivers = driverSettingsJson["availableDrivers"];
    $('.ui.dropdown').dropdown({
      values: downloadedDrivers
    }); // populate dropdown with array of drivers
  });
}

function updateActiveDriver() {
  $.getJSON(pathToDriverSettings, function (driverSettingsJson) {
    var availableDrivers = driverSettingsJson["availableDrivers"];
    var newActiveDriver = document.getElementsByClassName("item active selected")[0].innerHTML;
    var newDriverData = '{ "activeDriver" : "' + newActiveDriver + '", "availableDrivers" : ' + JSON.stringify(availableDrivers) + "}";
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

function downloadDriver() {
  console.log("Attempting to download driver. (This might take a while.)");
  var file = fs.createWriteStream("drivers/apache-phoenix-4.13.2-cdh5.11.2-bin.tar.gz");
  var sendReq = progress(request.get("https://archive.apache.org/dist/phoenix/apache-phoenix-4.13.2-cdh5.11.2/bin/apache-phoenix-4.13.2-cdh5.11.2-bin.tar.gz"));

  sendReq.on('progress', state => {
    console.log(state["percent"]);
  });
  
  sendReq.on('response', function (response) {
    if (response.statusCode !== 200) {
      console.log('Response status was ' + response.statusCode);
    }
  });

  sendReq.on('response', function ( data ) {
    console.log( data.headers[ 'content-length' ] );
  });

  sendReq.on('error', function (err) {
    fs.unlink("drivers/apache-phoenix-4.13.2-cdh5.11.2-bin.tar.gz");
    return cb(err.message);
  });

  sendReq.pipe(file);

  file.on('finish', function () {
    file.close();
    console.log("Finished downloading!");
  });

  file.on('error', function (err) {
    fs.unlink("drivers/apache-phoenix-4.13.2-cdh5.11.2-bin.tar.gz");
    console.log(err.message);
  });
}