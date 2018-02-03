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
const hashtagRef = know.child('hashtags');
const hashtagTimelineRef = know.child('hashtags-timeline');
const newSpreadRef = spreadsRef.push();

// Dialogflow Intent names
const SPREAD_DO_INTENT = 'spread-do'
const SPREADS_READ_INTENT = 'spread-read'
const GET_USER_INFO = 'get-user-info'
const GET_HELP = 'get-help'

// Context Parameters
const MESSAGE_PARAM = 'message';
const HASHTAG_PARAM = 'hashtag';
const USERNAME_PARAM = 'username';

const OUT_CONTEXT = 'output_context';

function checkUser(assistant) {
    const userName = assistant.getContextArgument(OUT_CONTEXT, USERNAME_PARAM);
    /*if (!userName) {
      const spread = '<speak><prosody volume="loud">You\'re not logged!</prosody></speak>'
      assistant.ask(spread)
    }*/
    return userName;
}

exports.tortolapp = functions.https.onRequest((request, response) => {
   console.log('headers: ' + JSON.stringify(request.headers));
   console.log('body: ' + JSON.stringify(request.body));

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(SPREAD_DO_INTENT, doSpread);
   actionMap.set(SPREADS_READ_INTENT, readSpread);
   actionMap.set(GET_USER_INFO, getUserInfo);
   actionMap.set(GET_HELP, getHelp);
   assistant.handleRequest(actionMap);

    function doSpread(assistant) {
        console.log('doSpread');
        var userName = checkUser(assistant);
        // var userName = assistant.getContextArgument(OUT_CONTEXT, USERNAME_PARAM);
        var message = assistant.getArgument(MESSAGE_PARAM);
        var hashtag = assistant.getArgument(HASHTAG_PARAM);
            hashtag = hashtag.toLowerCase();
            hashtag = hashtag.replace(" ", "");

        var message_obj = {
            user: userName,
            timestamp: admin.database.ServerValue.TIMESTAMP,
            msg: message,
        };

        // Set message
        newSpreadRef.set(message_obj);

        // Set hashtag child
        var newHashtagRef = hashtagRef.child(hashtag).push();
        newHashtagRef.set(message_obj);

        // Set hashtag timeline
        var newHashtagTimelineRef = hashtagTimelineRef.push();
        newHashtagTimelineRef.set({
            hashtag: hashtag,
            timestamp: admin.database.ServerValue.TIMESTAMP,
        });

        playersRef.child(newHashtag.key).set(message_obj);
    }

   function readSpread(assistant) {
        console.log('readSpread');

        spreadsRef.once('value', function (snap) {
            var speech = "";
            snap.forEach(function (childSnap) {
                console.log('spread', childSnap.val());
                var user = (childSnap.val() || {}).user || "Unknown";
                var message = (childSnap.val() || {}).msg || "WTF! I only had one job! this devs...";

                var pitch = "low";
                if ( Math.random() >= 0.5 ) pitch = "loud";

                speech = `<speak>${user} says <prosody pitch="${pitch}">${message}</prosody><break/></speak>`;
            });
            assistant.ask(speech);
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

   function getHelp(assistant) {
        const speech = `
            <speak>
                TODO message help!
                Say publish message to publish a new message.
                Say listen tortola to get your last message published.
                If you already haven't logged in tortolapp you need a new user identity,
                for example say 'my name is username' to login on the application.
            </speak>
        `;
        assistant.ask(speech);
   }
});