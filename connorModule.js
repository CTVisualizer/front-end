exports.performQuery = function(query) {
    var simpleJson = [
        {
            threat : "somemaliciousemail.com",
            notable : true,
            description: "This is a description of the threat" 
        },
        {
            threat : "anevilfile.txt",
            notable : false,
            description: "Some new description of the threat!" 
        },
        {
            threat : "dsaDASdDW#SxasD!@DASFVasdASDSAFsd",
            notable : true,
            description: "this is a bad bad bad bad bad threat." 
        },
        {
            threat : "myfile.html",
            notable : true,
            description: "no description found???" 
        },
        {
            threat : "totallyValidEmail@proofpoint.com",
            notable : false,
            description: null
        }
    ];
    return simpleJson;
};