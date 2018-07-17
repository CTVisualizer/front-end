exports.performQuery = function (query) {
    var simpleJson = 
    { 
        'metadata': 
            { 'columns': 
                [ 
                    { 'name': 'description', 'type': 'VARCHAR' }, 
                    { 'name': 'event_time', 'type': 'DATE' }, 
                    { 'name': 'notable', 'type': 'BOOLEAN' }, 
                    { 'name': 'verticals', 'type': 'VARCHAR ARRAY'},
                    { 'name': 'threat', 'type' : 'VARCHAR'}
                ]
            }, 
        'data': 
            [
                { 'description': 'description value', 'event_time': '2017-08-22 18:11:16.0', 'notable': true, 'verticals': ['cool', 'beans'], 'threat': 'bademail@gmail.com'},
                { 'description': 'here is another description', 'event_time': '2018-03-12 08:00:23.5', 'notable': false, 'verticals': ['some', 'verticals'], 'threat' : 'badwebsite.com' }
            ]
    };
    return simpleJson;
};