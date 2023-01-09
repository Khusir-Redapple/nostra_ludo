// Load the AWS SDK for Node.js
const path = require('path');
const util = require('util')

var AWS = require('aws-sdk');
const config = require('./config/index')
AWS.config.loadFromPath(path.resolve(__dirname, './config/sqs_config.json'));
const sqs = new AWS.SQS();


var params = {
  VisibilityTimeout: 400,
  WaitTimeSeconds: 20,
  // QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/478885374249/gamePlayDataQueue',
  QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/478885374249/stage-ludo-game-events'
};

sqs.receiveMessage(params, function(err, data) {
  if (err) {
    console.log("Receive Error", err);
  } else if (data.Messages) {
    // var object = JSON.parse(data.Messages);
    
    console.log("Message Received - ", data.Messages,data.Messages.length);
    // console.log("0 >",util.inspect( data.Messages[0].Body, {depth: null}));
    // for (let i=0; i<data.Messages.length; i++) {
    //     console.log("1 >", util.inspect(data.Messages[0].Body));
    // }
    // for (let i=0; i<data.Messages.length; i++) {
    //     var deleteParams = {
    //         QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/478885374249/gamePlayDataQueue',
    //         ReceiptHandle: data.Messages[i].ReceiptHandle
    //     };
    //     sqs.deleteMessage(deleteParams, function(err, data) {
    //         if (err) {
    //         console.log("Delete Error", err);
    //         } else {
    //         console.log("Message Deleted", data);
    //         }
    //     });
    // }
  }
});