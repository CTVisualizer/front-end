/* global $ */
const connorModule = require("./connorModule.js");

function generateTable(query){
  var resultsLocation = document.getElementById("queryResponse");
  resultsLocation.outerHTML = JSON.stringify(connorModule.performQuery(query));
}