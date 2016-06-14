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
            return Promise.reject({ message: 'Player not found', id: id });
        }

        return player;
    }));

const setPlayerName = (playerId, name) => db.c.then(c => db.players
        .get(playerId)
        .update({ name: name })
        .run(c));

const setPlayerPhone = (playerId, phone) => db.c.then(c => db.players
        .get(playerId)
        .update({ phone })
        .run(c));

// Choose all previously unchosen competitors for this player
const loadCompetitor = (playerId, previousCompetitorIds) => db.c.then(c => db.challenges
    .filter(db.r.row('players').contains(playerId))
    .nth(0) // The only challenge for this player
    .getField('players')
    .setDifference(previousCompetitorIds.concat(playerId))
    .run(c)
    .then(cursor => cursor.toArray())
    .then(competitors => {
        if (competitors.length == 0) {
            return Promise.reject({ message: 'Competitors not found for player', playerId: playerId });
        }

        return loadPlayer(competitors[0]);
    }));


module.exports = {
    createAll: createPlayers,
    loadAll: loadPlayers,
    feedAll: feedPlayers,
    load: loadPlayer,
    setName: setPlayerName,
    setPhone: setPlayerPhone,
    chooseCompetitor: loadCompetitor
};