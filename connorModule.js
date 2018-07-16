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
            description: "Some new description of the evil file!!!" 
        }
    ];
    return simpleJson;
};