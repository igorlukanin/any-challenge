const _ = require('lodash');
const config = require('config');
const db = require('../util/db');
const deck = require('../../data/deck');
const players = require('./player');


const isActive = card => !card.played && !card.skipped;

const isRegularAndActive = card => card.type == 'regular' && isActive(card);

const getCards = type => deck.filter(card => card.type == type);

// Deal all initial cards, if not already dealt
const dealInitialCards = dealtCards => getCards('initial')
    .filter(initialCard => !dealtCards.reduce((dealt, card) =>
        dealt || card.type_id == initialCard.type_id, false));

// Deal up to a limited number of unplayed and unskipped regular cards
// Skip previously chosen cards and competitors
const dealRegularCards = (dealtCards, dealtForHimAndCompetitor) => {
    const numberOfActiveCards = dealtCards
        .filter(isRegularAndActive)
        .length;

    const randomCards = getCards('regular')
        .filter(regularCard => !dealtForHimAndCompetitor.reduce((dealt, card) =>
            dealt || card.type_id == regularCard.type_id, false))
        .sort(() => 0.5 - Math.random());

    return randomCards.slice(0, config.get('game.limits.regular') - numberOfActiveCards);
};

const loadCardsByPlayer = playerId => db.c.then(c => db.cards
    .filter({ player: playerId })
    .run(c)
    .then(cursor => cursor.toArray()));

const dealInitialCardsByPlayer = playerId => loadCardsByPlayer(playerId)
    .then(cards => createCardsByPlayer(playerId, dealInitialCards(cards)));

const dealRegularCardsByPlayer = playerId => loadCardsByPlayer(playerId).then(cards => {
    const previousCompetitorIds = cards
        .filter(isRegularAndActive)
        .map(card => card.competitor);

    const competitor = players.chooseCompetitor(playerId, previousCompetitorIds);

    const hisCards = competitor.then(competitor => loadCardsByPlayer(competitor.id));

    return Promise
        .all([ competitor, hisCards ])
        .then(([ competitor, hisCards ]) => {
            const allRegularCards = cards
                .concat(hisCards)
                .filter(card => card.type == 'regular');

            createCardsByPlayerAndCompetitor(playerId, competitor.id, dealRegularCards(cards, allRegularCards))
        });
});

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

const createCardsByPlayerAndCompetitor = (playerId, competitorId, cards) => db.c.then(c => db.r
    .expr(cards)
    .map(row => row.merge({
        player: playerId,
        competitor: competitorId,
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

const feedPlayedOrSkippedCards = () => db.c.then(c => db.cards
    .filter(db.r.or(
        db.r.row('played').default(false).eq(true),
        db.r.row('skipped').default(false).eq(true)))
    .changes({ includeInitial: true })
    .run(c));


module.exports = {
    loadAllByPlayer: loadCardsByPlayer,
    feedPlayedOrSkipped: feedPlayedOrSkippedCards,
    play: playCard,
    skip: skipCard,
    dealInitialByPlayer: dealInitialCardsByPlayer,
    dealRegularByPlayer: dealRegularCardsByPlayer
};