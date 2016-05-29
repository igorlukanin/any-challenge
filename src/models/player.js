const config = require('config');
const db = require('../util/db');


const createPlayers = emails => db.c.then(c => db.r
    .expr(emails)
    .map(email => ({
        email,
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

const feedPlayers = () => db.c.then(c => db.players
    .changes({ includeInitial: true })
    .run(c));

const loadPlayer = id => db.c.then(c => db.players
    .get(id)
    .run(c)
    .then(player => {
        if (player == null) {
            return Promise.reject({
                message: 'Player not found',
                id: id
            });
        }

        return player;
    }));


module.exports = {
    createAll: createPlayers,
    loadAll: loadPlayers,
    feedAll: feedPlayers,
    load: loadPlayer,
};