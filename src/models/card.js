const config = require('config');
const deck = require('./deck');
const db = require('../util/db');


const loadCardsByPlayer = playerId => db.c.then(c => db.cards
    .filter({ player: playerId })
    .run(c)
    .then(cursor => cursor.toArray()));

const ensureInitialCardsAreDealtByPlayer = playerId => loadCardsByPlayer(playerId)
    .then(cards => createCardsByPlayer(playerId, deck.dealInitialCards(cards)));

const createCardsByPlayer = (playerId, cards) => db.c.then(c => db.r
    .expr(cards)
    .map(row => row.merge({
        player: playerId,
        creation_date: db.r.now()
    }))
    .forEach(row => db.cards.insert(row, { conflict: 'update', returnChanges: 'always' }))
    .run(c)
    .then(result => result.changes ? result.changes.map(change => change.new_val) : [])
    .then(cards => cards.map(card => card.id)));


module.exports = {
    loadAllByPlayer: loadCardsByPlayer,
    ensureInitialCardsAreDealtByPlayer: ensureInitialCardsAreDealtByPlayer
};