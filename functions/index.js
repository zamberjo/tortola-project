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
const likesRef = know.child('likes');
const newSpreadRef = spreadsRef.push();

// Dialogflow Intent names
const SPREAD_DO_INTENT = 'spread-do'
const SPREADS_READ_INTENT = 'spread-read'
const HASHTAG_READ_INTENT = 'hashtag-read'
const HASHTAG_DISCOVER_INTENT = 'hashtag-discover'
const TOP_SPREADS = 'most-liked'
const GET_HELP = 'get-help'
const ACTION_LIKE = 'action-like'

// Context Parameters
const MESSAGE_PARAM = 'message';
const HASHTAG_PARAM = 'hashtag';
const USERNAME_PARAM = 'username';

const OUT_CONTEXT = 'username';
const MSG_CONTEXT = 'message_id';

function checkUser(assistant) {
    const userName = assistant.getContextArgument(OUT_CONTEXT, USERNAME_PARAM);
    /*if (!userName) {
      const spread = '<speak><prosody volume="loud">You\'re not logged!</prosody></speak>'
      assistant.ask(spread)
    }*/
    return userName;
}

function parseHashtag(hashtag) {
    hashtag = hashtag.toLowerCase();
    hashtag = hashtag.replace(/\s/g, '');
    return hashtag;
}

function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

exports.tortolapp = functions.https.onRequest((request, response) => {
   console.log('headers: ' + JSON.stringify(request.headers));
   console.log('body: ' + JSON.stringify(request.body));

   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(SPREAD_DO_INTENT, doSpread);
   actionMap.set(SPREADS_READ_INTENT, readSpread);
   actionMap.set(HASHTAG_READ_INTENT, readHashtag);
   actionMap.set(HASHTAG_DISCOVER_INTENT, discoverHashtag);
   actionMap.set(ACTION_LIKE, actionLike);
   actionMap.set(TOP_SPREADS, topSpreads);
   actionMap.set(GET_HELP, getHelp);
   assistant.handleRequest(actionMap);

    function doSpread(assistant) {
        console.log('doSpread');
        var user = checkUser(assistant);
        // var userName = assistant.getContextArgument(OUT_CONTEXT, USERNAME_PARAM).value;
        var message = assistant.getArgument(MESSAGE_PARAM);

        var message_obj = {
            uuid: guid(),
            user: user.value,
            timestamp: admin.database.ServerValue.TIMESTAMP,
            msg: message,
        };

        // Set message
        newSpreadRef.set(message_obj);

        // Set hashtag child
        var hashtag = assistant.getArgument(HASHTAG_PARAM);
        if (hashtag) {
            hashtag = parseHashtag(hashtag);
            var newHashtagRef = hashtagRef.child(hashtag).push();
            newHashtagRef.set(message_obj);
        }
    }

   function readSpread(assistant) {
        console.log('readSpread');

        spreadsRef.once('value', function (snap) {
            var speech = "";
            var last_childSnap;
            snap.forEach(function (childSnap) {
                console.log('spread', childSnap.val());
                var user = (childSnap.val() || {}).user || "Unknown";
                var message = (childSnap.val() || {}).msg || "WTF! I only had one job! this devs...";

                var pitch = "low";
                if ( Math.random() >= 0.5 ) pitch = "loud";

                speech = `<speak>${user} says <prosody pitch="${pitch}">${message}</prosody><break/></speak>`;
                last_childSnap = childSnap;
            });
            const parameters = {};
            parameters["message_id"] = last_childSnap.val().uuid;
            assistant.setContext(MSG_CONTEXT, 1, parameters);
            assistant.ask(speech);
        });
   }

   function readHashtag(assistant) {
        console.log('readHashtag');
        var hashtag = parseHashtag(assistant.getArgument(HASHTAG_PARAM));

        hashtagRef.child(hashtag).once('value', function (snap) {
            var speech = "";
            var last_childSnap;
            snap.forEach(function (childSnap) {
                console.log('hashtag', childSnap.val());
                var user = (childSnap.val() || {}).user || "Unknown";
                var message = (childSnap.val() || {}).msg || "WTF! I only had one job! this devs...";

                var pitch = "low";
                if ( Math.random() >= 0.5 ) pitch = "loud";

                speech = `<speak>${user} says <prosody pitch="${pitch}">${message}</prosody><break/></speak>`;
                last_childSnap = childSnap;
            });
            if ( last_childSnap ) {
                const parameters = {};
                parameters["message_id"] = last_childSnap.val().uuid;
                assistant.setContext(MSG_CONTEXT, 1, parameters);
                assistant.ask(speech);
            } else {
                assistant.ask(`<speak>Sorry, the hashtag ${hashtag} does not exist</speak>`);
            }
        });
   }

   function discoverHashtag(assistant) {
        console.log('discoverHashtag');

        hashtagRef.once('value', function (snap) {
            // var hashtagArray = new Array();
            // snap.forEach(function (childSnap) {
            //     var hashtag = childSnap.key;
            //     hashtagArray.push(hashtag);
            // });
            // assistant.askWithList(
            //     "List hashtags",
            //     assistant.buildList('List hashtags')
            //         .addItems(
            //             assistant.buildOptionItem("Hashtags", hashtagArray)));
            
            // API V2
            // var list = assistant.buildList('List hashtags');
            // snap.forEach(function (childSnap) {
            //     var hashtag = childSnap.key;
            //     list.addItems(assistant.buildOptionItem(hashtag.toUpperCase(), [hashtag, hashtag]));
            // });
            // assistant.askWithList("List hashtags", list);

            var speech_str = "";
            snap.forEach(function (childSnap) {
                var hashtag = childSnap.key;
                speech_str = speech_str + hashtag + ", <break/>";
            });
            assistant.ask(`<speak>${speech_str}</speak>`);
        });
   }

   function actionLike(assistant) {
        const lastMessage = assistant.getContextArgument(MSG_CONTEXT, MSG_CONTEXT);
        if (!lastMessage){
            assistant.ask('<speak><prosody volume="loud">Not read any message recently!</prosody></speak>');
            return;
        }
        const lastMessageId = lastMessage.value;
        likesRef.child(lastMessageId).once('value', snap => {
            var likes = (snap.val() || {}).likes || 0
            likes = likes + 1;
            
            likesRef.child(lastMessageId).set({
                likes: likes
            });

            assistant.ask(`<speak>This message has ${likes} likes</speak>`);
        });
        console.log(lastMessageId);
   }

    function topSpreads(assistant) {
        likesRef.orderByChild("likes").once('value', snap => {
            var likes = (snap.val() || {}).likes || 0
            assistant.ask(`<speak>Best spread have ${likes} likes</speak>`);
        });
    }

   function getHelp(assistant) {
        var speech = '<speak>';
          speech = speech + 'Say \'publish message\' to publish a new message.<break/>\n';
          speech = speech + 'Say \'listen message\' to get your last message published.<break/>\n';
          speech = speech + 'Say \'give me the latest hashtags\' to get the last message published with this hashtag.<break/>\n';
          speech = speech + 'Say \'message with most likes\' to get the message with more likes.<break/>\n';
          speech = speech + 'After read a message, say \'like it\' to give it a like.<break/>\n';
          speech = speech + 'If you already haven\'t logged in tortolapp you need a new user identity,';
          speech = speech + 'for example say \'my name is username\' to login on the application.<break/>';
          speech = speech + 'Say \'Finish\' or \'Good bye\' to close the app.\n';
          speech = speech + '</speak>';
        assistant.ask(speech);
   }

});