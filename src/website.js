const compression = require('compression');
const config = require('config');
const bodyParser = require('body-parser');
const ect = require('ect');
const express = require('express');

const controllers = require('./controllers');
const log = require('./util/log');

const port = config.get('server.port');


process.on('uncaughtException', (err) => console.error(err.stack));
require('promise/lib/rejection-tracking').enable({ allRejections: true });


express()
    .use('/static', express.static('static'))
    .use('/static/js/d3', express.static('node_modules/d3'))

    .use(compression())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(controllers)

    .set('view engine', 'ect')
    .engine('ect', ect({
        watch: true,
        root: __dirname + '/../views'
    }).render)

    .listen(port, () => log.appState('website', 'started at port ' + port));