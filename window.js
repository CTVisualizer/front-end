/* global $ */
const connorModule = require("./connorModule.js");
const Table = require('table-builder');
var queryResults;
var currentComponent = 1; // current component which is being viewed (1=DB visualizer, 2=help, 3=settings)
var sqlVisualizerHtml; // current HTML state of the Sql Visualizer component

function generateTable(){
  var query = document.getElementById("queryInput").innerHTML;
  var queryResults = connorModule.performQuery(query);
  var headers = { "threat" : "Threat", "notable": "Notable", "description": "Description" };
  var tableHtml = (
    (new Table({"class": "ui fixed single line celled table", "id" : "queryResponse", "style" : "overflow-x:auto"}))
      .setHeaders(headers)
      .setData(queryResults)
      .render()
  );
  $("#queryResponse").html(tableHtml);
}

function clearResults(){
  $("#queryResponse").html("<table></table>");
}

function stopQuery(){
  queryResults = "";
  clearResults();
}

function switchComponent(newComponent){
  if(currentComponent==1)
    sqlVisualizerComponent = $("#mainComponent").html();
  if(newComponent==1){
    $("#mainComponent").html(sqlVisualizerComponent);
  } else if (newComponent==2){
    $("#mainComponent").html(helpComponent);
  } else if(newComponent==3) {
    $("#mainComponent").html(settingsComponent);
  }
  currentComponent = newComponent;
}

var helpComponent="<container id='mainComponent'><div class='ui container'><h2>Help</h2><p>This is a database visualizer tool built by "+
"Indianpolis Proofpoint Interns as a part of Hack Day 2018. It is intended to be used with Apache Phoenix for NTX development. You must "+
"include the Phoenix Driver you are using in the settings tab.</p></div></container>"

var settingsComponent="<container id='mainComponent'><div class='ui container'><h2>Settings</h2><p>This is where the settings will live. </p></div></container>"