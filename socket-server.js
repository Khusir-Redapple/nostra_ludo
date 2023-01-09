const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();
const https = require('https');
const http = require('http');
const config = require('./config');
const mongoose = require('mongoose');
const morgan = require('morgan');
var logger = require('./api/service/logger');
var fs = require('fs');
// generate custom token 
morgan.token('host', function (req) {
    return req.hostname;
});

// setup the logger 
app.use(morgan(':method :host :url :status :res[content-length] - :response-time ms'));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

require('./routes/index')(router);

app.use(
    bodyParser.urlencoded({
        extended: true,
        type: 'application/x-www-form-urlencoded'
    })
);

app.use(bodyParser.json());
app.use('/', router);
app.use('/hello', function(req, res) {
    logger.info('404 Hit>',req.method, req.url, req.body);
    console.log("hello",req.headers,);
    // res.send("hello",req.headers,);
});
// const options = {
//     key: fs.readFileSync('../../../etc/letsencrypt/live/multiplayer.staging-server.in/privkey.pem'),
//     cert: fs.readFileSync('../../../etc/letsencrypt/live/multiplayer.staging-server.in/fullchain.pem')
// };
  
// const server = https.createServer(options,app);
const server = http.createServer(app);
const socket = require('socket.io')(server);
require('./socket')(socket);

/**
 *	Server bootup section
 **/
try {
    const AWS = require('aws-sdk');
    (async() => { 
        AWS.config = new AWS.Config();
        let AWS_REGION = process.env.AWS_REGION || 'ap-south-2';
        console.log("IAWS_REGION-", AWS_REGION)
        var ssm = new AWS.SSM({region: AWS_REGION});
        console.log('SSM===>', ssm)
        var Names =  process.env.NODE_ENV != 'production' ? ["/staging/ludo/mongodb/host","/staging/ludo/mongodb/password","/staging/ludo/mongodb/port","/staging/ludo/mongodb/username"] : ["/prod/ludo/docdb/host","/prod/ludo/docdb/password","/prod/ludo/docdb/port","/prod/ludo/docdb/username"];
        let keys = [];
        // eslint-disable-next-line no-console

        const getParams = async (Names,i) => {
            try {           
                console.log("getParams called", Names.length, i)
                if(i < Names.length){
                    // console.log(`Getting secret for ${Names[i]}`);
                    const params = {
                        Name: Names[i],
                        WithDecryption: true,
                    };
                    console.table(`<<<< PARAMS >>>> ${params.Name} , ${typeof params.Name}`);
                    const result = await ssm.getParameter(params).promise();
                    console.log("[SSM Result] - ", result);
                    keys.push(result.Parameter.Value);
                    i++;
                    getParams(Names,i);
                }
                else{
                    console.log("All final keys- ",keys)
                    process.env.DB_HOST = keys[0] ? keys[0] : process.env.DB_HOST;
                    process.env.DB_PASS = keys[1] ? keys[1] : process.env.DB_PASS;
                    process.env.DB_PORT = keys[2] ? keys[2] : process.env.DB_PORT;
                    process.env.DB_USER = keys[3] ? keys[3] : process.env.DB_USER;
                    process.env.DB_NAME = process.env.DB_NAME ? process.env.DB_NAME : 'nostra_playing'
                    
                    console.log("SSM PARAMS - ",  process.env.DB_HOST,process.env.DB_PASS, process.env.DB_PORT, process.env.DB_USER );
                    // DB Connect
                    setTimeout(function(){
                        let dbConnectionUrl = process.env.NODE_ENV != 'production' ? `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}` : `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`; //process.env.MONGO_LOCAL;
                        console.log("DB STRING - ",  process.env.DB_USER,process.env.DB_PASS, process.env.DB_HOST, process.env.DB_USER, process.env.DB_PORT)
                        mongoose.set('useCreateIndex', true);
                        mongoose.connect(
                            // "mongodb://localhost:$27017/nostra_playing",
                            `${dbConnectionUrl}`,
                            { useNewUrlParser: true},
                            d => {
                                if (d) return logger.info(`ERROR CONNECTING TO DB ${dbConnectionUrl}`, d, dbConnectionUrl);
                                logger.info(`Connected to ${process.env.NODE_ENV} database: `, `${dbConnectionUrl}`);
                                server.listen(config.port, async function (err) {
                                    if (err) throw err 
                                    logger.info('Socket Server listening at PORT:' + config.port);
                                });
                            }
                        );
                    },500)
                }
            } catch (error) {
                 console.log("SSM Get Params error - ",error) 
            }
        }
        await getParams(Names, 0)
    })()
    
   
} catch (err) {
    logger.info('DBCONNECT ERROR', err);
}

module.exports = server;
