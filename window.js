/* global $ */
const connorModule = require("./connorModule.js");

function generateTable(){
  var query = document.getElementById("queryInput").innerHTML;
  var queryResults = connorModule.performQuery(query);
  var newTableHtml = "<table class='ui celled table' id='queryResponse'>\n<tbody>\n";
  for(var i = 0; i < queryResults.length; i++){
    var newTableRow="<tr>\n"+JSON.stringify(queryResults[i])+"\n</tr>\n";
    newTableHtml+=newTableRow;
  }
  newTableHtml+="</tbody>\n</table>\n"
  console.log(newTableHtml);
  var resultsLocation = document.getElementById("queryResponse");
  resultsLocation.outerHTML = newTableHtml;
}