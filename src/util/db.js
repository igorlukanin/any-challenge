var config = require('config'),
    Promise = require('promise'),
    r = require('rethinkdb'),

    tables = [ 'challenges', 'players', 'events' ];


var options = {
    host: config.get('rethinkdb.host'),
    port: config.get('rethinkdb.port'),
    db: config.get('rethinkdb.db')
};


module.exports = {
    r: r,
    c: r.connect(options)
};

tables.forEach((table) => module.exports[table] = r.table(table));