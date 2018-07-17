/* global $ */
const connorModule = require("./connorModule.js");
const Table = require("table-builder");
const request = require("request");
//const child_process = require('child_process');
const fs = require("fs");
var currentComponent = 1; // current component which is being viewed (1=DB visualizer, 2=help, 3=drivermanager, 4=help)
var htmlComponents = require("./htmlComponents.json");
const pathToSettings = "./config/settings.json";
const pathToDriverSettings = "./config/driversettings.json";

//State data to sustain across component changes
var currentEnteredQuery;  // Query in the user's entry field
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
      if(!query){
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
              (new Table({ "class": "ui fixed single line celled table", "id": "queryResponse", "style": "overflow-x:auto" }))
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

function manageDrivers(){
  updateSettings();
  switchComponent(3);
  populateAvailableDrivers();
  $('.ui.dropdown').dropdown();
}

//CONFIGURATION FUNCTIONS
function updateSettings() {
  var newSettingsData = { "quorum": "", "port": "", "hbase-node": "", "principal": "", "path-to-keytab": ""};
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
  });
}

//Enable dropdowns on page ready
$( document ).ready(function() {
  $('.ui.dropdown').dropdown();
});