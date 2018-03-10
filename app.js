var express = require('express'),
jsforce = require('jsforce');
var bodyParser = require('body-parser');
var app = express();
app.listen(3978, function() {
	console.log("Listening on 3978");
});
//
// OAuth2 client information can be shared with multiple connections.
//
var oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : 'https://test.salesforce.com',
  clientId : '3MVG9Nc1qcZ7BbZ0huGJrAcA6yRz2eu52uqtw9l4G98cIwWoxgrHEn6uRuDufpXJ2d4e2wv30Ac.uNreHZmDv',
  clientSecret : '4077410849799319490',
  redirectUri : 'http://localhost:3978/oauth/callback'
});
//
// Get authorization url and redirect to it.
//
app.get('/oauth/auth', function(req, res) {
  res.redirect(oauth2.getAuthorizationUrl({ scope : 'api' }));
});

var accessToken;
var refreshToken;
var instanceUrl;

//
// Pass received authorization code and get access token
//
app.get('/oauth/callback', function(req, res) {
  var conn = new jsforce.Connection({ oauth2 : oauth2 });
  var reqCode = req.param('code');
  conn.authorize(reqCode, function(err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token, refresh token, and instance URL information.
    // Save them to establish connection next time.
    accessToken = conn.accessToken;
    refreshToken = conn.refreshToken;
    instanceUrl = conn.instanceUrl;
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    // ...
    res.send('success'); // or your desired response
  });
});

app.get('/accounts', function(req, res) {
    // if auth has not been set, redirect to index
    if (!accessToken || !instanceUrl) { res.redirect('/oauth/auth'); }

    var query = 'SELECT id, name FROM account LIMIT 10';
    // open connection with client's stored OAuth details
    var conn = new jsforce.Connection({
        accessToken: accessToken,
        instanceUrl: instanceUrl
    });
    console.log("-------------------------");
    conn.query(query, function(err, result) {
        if (err) {
            console.error(err);
            res.redirect('/');
        }
        console.log("Account - " + result.records);
        res.send({title: 'Accounts List', accounts: result.records});
    });
});

//****************************************************************************
//                                  BOT
//****************************************************************************

var builder = require('botbuilder');  
// Setup Restify Server 
// chat connector for communicating with the Bot Framework Service 
var connector = new builder.ChatConnector({     
    appId: process.env.MICROSOFT_APP_ID,     
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
// Listen for messages from users  
app.post('/api/messages', connector.listen());  
// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:') 
var bot = new builder.UniversalBot(connector);

// Bot introduces itself and says hello upon conversation start
bot.on('conversationUpdate', function (message) {    
   if (message.membersAdded[0].id === message.address.bot.id) {             
         var reply = new builder.Message()    
               .address(message.address)    
               .text("Hey dude!!! :D Its time for our daily check in.");        
         bot.send(reply);    
   }
}); 

bot.dialog('/', [function(session) {   
    if (!accessToken || !instanceUrl) { 
      session.endDialog("Invalid session.");
    }

    var query = "select Id, Name, TMS__Project__c, Project_Name__c from TMS__Project_Resource__c where TMS__Contact__c = '003190000043tu6'";
    // open connection with client's stored OAuth details
    var conn = new jsforce.Connection({
        accessToken: accessToken,
        instanceUrl: instanceUrl
    });
    console.log("-------------------------");
    conn.query(query, function(err, result) {
        if (err) {
            console.error(err);
            session.endDialog("Invalid session.");
        }
        var projectList = "";
        for (var i=0; i < result.records.length; i++) {
            projectList += (i+1) + "." + JSON.stringify(result.records[i].Project_Name__c) + "\n";
            console.log("!!!!!!!!!!!!!" + JSON.stringify(result.records[i].Project_Name__c));
        }
        console.log("Account - " + JSON.stringify({title: 'Accounts List', accounts: result.records}));
        builder.Prompts.text(session, projectList);
    });    
    builder.Prompts.text(session, "Which project did you work on yesterday ?" );
},
function(session, results) {
	if (results.response === "today") {
		session.beginDialog("/today");
	}
}]);

bot.dialog('/today', [function(session) {    
	if (!accessToken || !instanceUrl) { 
		session.endDialog("Invalid session.");
	}

    var query = 'SELECT id, name FROM account LIMIT 1';
    // open connection with client's stored OAuth details
    var conn = new jsforce.Connection({
        accessToken: accessToken,
        instanceUrl: instanceUrl
    });
    console.log("-------------------------");
    conn.query(query, function(err, result) {
        if (err) {
            console.error(err);
            session.endDialog("Invalid session.");
        }
        console.log("Account - " + JSON.stringify({title: 'Accounts List', accounts: result.records}));
        builder.Prompts.text(session, JSON.stringify({title: 'Accounts List', accounts: result.records}));
    }); 
},function(session, results) {     
	session.send(" ?");
}
]);