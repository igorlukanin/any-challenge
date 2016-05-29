const config = require('config');
const db = require('../util/db');


const createPlayers = emails => db.c.then(c => db.r
    .expr(emails)
    .map(email => ({ email }))
    .map(row => row.merge({
        id: db.r.uuid(row('email').add('_').add(config.get('secret'))),
        creation_date: db.r.now()
    }))
    .forEach(row => db.players.insert(row, { conflict: 'update', returnChanges: 'always' }))
    .run(c)
    .then(result => result.changes.map(change => change.new_val))
    .then(players => players.map(player => player.id)));

const loadPlayers = ids => db.c.then(c => db.players
    .getAll(db.r.args(ids))
    .run(c)
    .then(cursor => cursor.toArray()));


module.exports = {
    createAll: createPlayers,
    loadAll: loadPlayers
};