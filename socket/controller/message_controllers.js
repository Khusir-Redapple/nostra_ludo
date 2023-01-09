'use strict';

const {
    sqsSendMessage
} = require('../../api/operations/sqs_operations');


class MessageController {

    /**
     * Send message from this route handler
     */
    async sendMessage(req) {
        try {
            let id = new Date().getTime();
            id = String(id);
            const params = { 
                MessageBody: JSON.stringify(req.data), 
                // MessageGroupId: id,
                // MessageDeduplicationId: id,
            };
            console.log("sendMessage data >",params)
            let result = await sqsSendMessage(params);
            return result;
        } catch(error) {
            console.log("SQS sendMessage ERROR : ",error)
            return false;
        }
    }
}

module.exports = new MessageController();