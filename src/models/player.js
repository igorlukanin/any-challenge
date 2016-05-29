const config = require('config');
const db = require('../util/db');


const createUniqueId = email => email + '_' + config.get('secret');

const createEntityId = email => db.c.then(c => db.r.uuid(createUniqueId(email)).run(c));

const createForInsert = email => createEntityId(email).then(id => ({
    id: id,
    email: email
}));

const createPlayers = emails => db.c.then(c => db.r
    .expr(emails)
    .map(email => ({ email }))
    .map(row => row.merge({
        id: db.r.uuid(row('email').add('_')),
        creation_date: db.r.now()
    }))
    .forEach(row => db.players.insert(row, { conflict: 'update', returnChanges: 'always' }))
    .run(c)
    .then(result => result.changes.map(change => change.new_val))
    .then(players => players.map(player => player.id)));


module.exports = {
    createAll: createPlayers
};