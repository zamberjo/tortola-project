'use strict';

process.env.DEBUG = 'actions-on-google:*';

//const Assistant = require('actions-on-google').ApiAiAssistant;
const actionsOnGoogle = require('actions-on-google');
const Assistant = actionsOnGoogle.DialogflowApp;
const ActionsSdkApp = actionsOnGoogle.ActionsSdkApp;

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const know = admin.database().ref('/tortolapp-spreads');
const spreadsRef = know.child('spreads');
const newSpreadRef = spreadsRef.push();

// Dialogflow Intent names
const SPREAD_DO_INTENT = 'spread-do'
const SPREADS_READ_INTENT = 'spread-read'
const GET_USER_INFO = 'get-user-info'

// Context Parameters
const MESSAGE_PARAM = 'message';
const USERNAME_PARAM = 'username';

const OUT_CONTEXT = 'output_context';

exports.tortolapp = functions.https.onRequest((request, response) => {
   console.log('headers: ' + JSON.stringify(request.headers));
   console.log('body: ' + JSON.stringify(request.body));

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(SPREAD_DO_INTENT, doSpread);
   actionMap.set(SPREADS_READ_INTENT, readSpread);
   actionMap.set(GET_USER_INFO, getUserInfo);
   assistant.handleRequest(actionMap);

    /*function getHastags(message) {
        var messageArray = message.split(" ");
        var hastagsArray = new Array();
        for(var i =0 ; i < message2.length ; i++){
            if (messageArray[i] === "hastag") {
                hastagsArray.push(messageArray[i + 1]);
            }
        }
        return hastagsArray;
    }*/

   function doSpread(assistant) {
        console.log('doSpread');
        var userName = assistant.getContextArgument(OUT_CONTEXT, USERNAME_PARAM);      
        var message = assistant.getArgument(MESSAGE_PARAM);
        //var hastagsArray = getHastags(message);

        newSpreadRef.set({
            user: userName,
            timestamp: admin.database.ServerValue.TIMESTAMP,
            msg: message,
        });

        // for(var i =0 ; i < hastagsArray.length ; i++){
        //     var hastag = messageArray[i];
        //     var newHastagSpreadRef = spreadsRef.child(hastag);

        //     spreadsRef.child(hastag).once('value', snap => {
        //         var count = (snap.val() || {}).count || 0

        //         playersRef.child(playerName).set({
        //             count: count + 1
        //         });

        //         //const speech = `<speak>Faba añadida a ${playerName}</speak>`;
        //         //assistant.ask(speech);
        //     });
        // }
   }

   function readSpread(assistant) {
        console.log('readSpread');

        spreadsRef.once('value', function (snap) {
            var speech = "";

            snap.slice(0, 3).forEach(function (childSnap) {
                console.log('spread', childSnap.val());
                var user = (snap.val() || {}).user || "Unknown";
                var message = (snap.val() || {}).msg || "WTF! I only had one job! this devs...";

                var pitch = "low";
                if ( Math.random() >= 0.5 ) pitch = "loud";

                speech = speech + '${user} says <prosody pitch="${pitch}">${message}</prosody><break/>';
            });
            assistant.ask("<speak>" + speech + "</speak>");
        });
   }

   function getUserInfo(assistant) {
        console.log('getUserInfo');
        const app = new ActionsSdkApp(assistant.requestData);      
        const user = app.getUser()
        
        console.log('USER: ' + user.userId)
        console.log('USER ID: ' + user.userId)
        assistant.ask('USER ID: ' + user.userId);
   }
});