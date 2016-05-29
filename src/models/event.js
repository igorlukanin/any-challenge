const config = require('config');
const db = require('../util/db');


const loadEventsByPlayer = playerId => db.c.then(c => db.events
    .filter({ player: playerId })
    .run(c)
    .then(cursor => cursor.toArray()));


module.exports = {
    loadAllByPlayer: loadEventsByPlayer,
};