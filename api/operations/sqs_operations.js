'use strict';

/*** Required module for SQS queue based messaging service */
const aws = require('aws-sdk');
aws.config = new aws.Config();
aws.config.region = process.env.AWS_REGION || 'ap-south-2';
console.log("aws config - ",aws.config)
const path = require('path');
const config = require('../../config/index')
//aws.config.loadFromPath(path.resolve(__dirname, '../../config/sqs_config.json'));
const sqsAwsInstance = new aws.SQS();

const commonQueueParams = {
    QueueUrl: config.QUEUE_URL,
};

class MessageOperations {
    
    constructor() {
        this.sqsSendMessage = this.sqsSendMessage.bind(this);
     }

    /**
    * Send message to sqs service
    * @param {params} params 
    */
    async sqsSendMessage(params) {
        console.log("sqsSendMessage params = ",params)
        return new Promise((resolve, reject) => {
            params = { ...commonQueueParams, ...params };
            sqsAwsInstance.sendMessage(params, function (error, data) {
                console.log("data >>>",data)
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        });
    }

    
}

module.exports = new MessageOperations();
