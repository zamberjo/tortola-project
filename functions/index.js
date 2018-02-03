'use strict';

process.env.DEBUG = 'actions-on-google:*';

const Assistant = require('actions-on-google').ApiAiAssistant;
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const know = admin.database().ref('/tortolapp-spreads');
const spreadsRef = know.child('spreads');

// Dialogflow Intent names
const SPREAD_DO_INTENT = 'spread-do'
const SPREADS_READ_INTENT = 'spread-read'

// Context Parameters
const MESSAGE_PARAM = 'message';
const USERNAME_PARAM = 'username';

exports.tortolapp = functions.https.onRequest((request, response) => {
   console.log('headers: ' + JSON.stringify(request.headers));
   console.log('body: ' + JSON.stringify(request.body));

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(SPREAD_DO_INTENT, doSpread);
   actionMap.set(SPREADS_READ_INTENT, readSpread);
   assistant.handleRequest(actionMap);

   function doSpread(assistant) {
        console.log('doSpread');
        var userName = assistant.getArgument(USERNAME_PARAM);
        var message = assistant.getArgument(MESSAGE_PARAM);

        var newMessageRef = spreadsRef.push();
        newMessageRef.set({
            user: userName,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            msg: message,
        }, function onComplete() {
            const speech = `<speak>TODO ${userName} turtledove sent!</speak>`;
            assistant.ask(speech);
        });
   }

   function readSpread(assistant) {
        console.log('readSpread');
        const playerName = assistant.getArgument(USERNAME_PARAM);

        spreadsRef.child(playerName).once('value', snap => {
            var count = (snap.val() || {}).count || 0

            const speech = `<speak>${playerName} lleva ${count} fabas</speak>`;
            assistant.ask(speech);
        });
   }
});