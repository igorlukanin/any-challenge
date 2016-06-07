var config = require('config'),
    r = require('rethinkdb'),

    tables = [ 'challenges', 'players', 'cards' ];


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