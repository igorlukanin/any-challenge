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

const loadCard = id => db.c.then(c => db.cards
    .get(id)
    .run(c)
    .then(card => {
        if (card == null) {
            return Promise.reject({ message: 'Card not found', id: id });
        }

        return card;
    }));

const playCard = id => loadCard(id).then(card => {
    if (card.played || card.skipped) {
        return Promise.reject({ message: 'Card already played or skipped', id: id });
    }

    card.played = true;

    return db.c.then(c => db.cards
        .get(card.id)
        .update(card, { returnChanges: 'always' })
        .run(c)
        .then(result => result.changes[0].new_val));
});

const skipCard = id => loadCard(id).then(card => {
    if (card.played || card.skipped) {
        return Promise.reject({ message: 'Card already played or skipped', id: id });
    }

    card.skipped = true;

    return db.c.then(c => db.cards
        .get(card.id)
        .update(card, { returnChanges: 'always' })
        .run(c)
        .then(result => result.changes[0].new_val));
});


module.exports = {
    loadAllByPlayer: loadCardsByPlayer,
    play: playCard,
    skip: skipCard,
    ensureInitialCardsAreDealtByPlayer: ensureInitialCardsAreDealtByPlayer
};