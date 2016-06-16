const Promise = require('promise');
const db = require('../util/db');


const createChallenge = (title, playerIds) => db.c.then(c => db.challenges
    .insert({
        title,
        players: playerIds,
        creation_date: db.r.now()
    }, { conflict: 'update' })
    .run(c)
    .then(result => result.generated_keys[0]));

const loadChallenge = id => db.c.then(c => db.challenges
    .get(id)
    .run(c)
    .then(challenge => {
        if (challenge == null) {
            return Promise.reject({ message: 'Challenge not found', id: id });
        }

        return challenge;
    }));

const loadChallengeByPlayer = playerId => db.c.then(c => db.challenges
    .filter(db.r.row('players').contains(playerId))
    .nth(0) // The only challenge for this player
    .run(c)
    .then(challenge => {
        if (challenge == null) {
            return Promise.reject({ message: 'Challenge not found', id: id });
        }

        return challenge;
    }));


module.exports = {
    create: createChallenge,
    load: loadChallenge,
    loadByPlayer: loadChallengeByPlayer
};