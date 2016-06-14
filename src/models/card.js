const _ = require('lodash');
const config = require('config');
const db = require('../util/db');
const deck = require('../../data/deck').map(require('../util/transform-card'));
const players = require('./player');


const isInitial = card => card.type == 'initial';
const isRegular = card => card.type == 'regular';

// Deal all initial cards, if not already dealt
const dealInitialCards = dealtCards => deck
    .filter(isInitial)
    .filter(initialCard => !dealtCards.reduce((dealt, card) =>
        dealt || card.type_id == initialCard.type_id, false));

// Deal up to a limited number of unplayed regular cards
// Skip previously chosen cards and competitors
const dealOneRegularCard = (dealtCards, dealtForHimAndCompetitor) => {
    const randomCards = deck
        .filter(isRegular)
        .filter(regularCard => !dealtForHimAndCompetitor.reduce((dealt, card) =>
            dealt || card.type_id == regularCard.type_id, false))
        .sort(() => 0.5 - Math.random());

    return randomCards[0];
};

const loadCardsByPlayer = playerId => db.c.then(c => db.cards
    .filter({ player: playerId })
    .run(c)
    .then(cursor => cursor.toArray()));

const loadCardsByCompetitor = playerId => db.c.then(c => db.cards
    .filter({ competitor: playerId })
    .run(c)
    .then(cursor => cursor.toArray()));

const loadAllCards = playerId => {
    const hisCards = loadCardsByPlayer(playerId)
        .then(cards => Promise.all(cards.map(card => {
            card.own = true;

            return card.solo ? card : players
                .load(card.competitor)
                .then(competitor => {
                    card.competitor = competitor;
                    return card;
                });
        })));

    const hisCardsAsCompetitor = loadCardsByCompetitor(playerId)
        .then(cards => Promise.all(cards.map(card => players
            .load(card.player)
            .then(player => {
                card.own = false;
                card.player = player;
                return card;
        }))));

    return Promise
        .all([ hisCards, hisCardsAsCompetitor ])
        .then(([ hisCards, hisCardsAsCompetitor ]) => hisCards.concat(hisCardsAsCompetitor))
        .then(cards => {
            cards.sort((one, two) =>
            (one.priority || one.creation_date.getTime()) -
            (two.priority || two.creation_date.getTime()));
            return cards;
        });
};

const dealInitialCardsByPlayer = playerId => loadCardsByPlayer(playerId)
    .then(cards => createCardsByPlayer(playerId, dealInitialCards(cards)));

const dealRegularCardsByPlayer = playerId => loadAllCards(playerId).then(cards => {
    const initialCards = cards.filter(isInitial);
    const unplayedInitialCardsCount = initialCards.filter(card => !card.played).length;

    const regularCards = cards.filter(isRegular);
    const unplayedRegularCardsCount = regularCards.filter(card => !card.played).length;

    if (unplayedInitialCardsCount == 0 && (config.get('game.limits.regular') - unplayedRegularCardsCount) > 0) {
        const previousCompetitorIds = regularCards
            .filter(card => card.competitor != undefined)
            .map(card => card.competitor.id != undefined ? card.competitor.id : card.competitor);
        
        const competitor = players.chooseCompetitor(playerId, previousCompetitorIds);
        const hisCards = competitor.then(competitor => loadCardsByPlayer(competitor.id));

        return Promise
            .all([ competitor, hisCards ])
            .then(([ competitor, hisCards ]) => {
                const allRegularCards = hisCards
                    .filter(isRegular)
                    .concat(regularCards);

                const card = dealOneRegularCard(cards, allRegularCards);

                if (card) {
                    return createCardsByPlayerAndCompetitor(playerId, competitor.id, [ card ]);
                }
                else {
                    return Promise.reject({
                        message: 'No cards left for player',
                        id: playerId
                    });
                }
            });
    }
    else {
        return Promise.reject({
            message: 'All cards dealt for player',
            id: playerId
        });
    }
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

const applyActionToCard = (id, action, input) => loadCard(id).then(card => {
    if (card.played) {
        return Promise.reject({ message: 'Card already played', id: id });
    }
    
    action(card, input);

    return db.c.then(c => db.cards
        .get(card.id)
        .update(card)
        .run(c));
});

const playCard = (id, input) => applyActionToCard(id, function(card, input) {
    if (card.type_id == 'initial_name') {
        if (input != undefined && input.length > 0) {
            players.setName(card.player, input);
        }
        else {
            return Promise.reject({ message: 'Input should not be empty for this card', id: id });
        }
    }
    else if (card.type_id == 'initial_phone') {
        if (input != undefined && input.length > 0) {
            input = input.replace(/\D/g, '');

            if (input.length == 11) {
                players.setPhone(card.player, input);
            }
            else {
                return Promise.reject({ message: 'Input should contain exactly 11 numbers for this card', id: id });
            }
        }
        else {
            return Promise.reject({ message: 'Input should not be empty for this card', id: id });
        }
    }
    else if (card.type_id == 'initial_telegram') {
        if (input != undefined && input.length > 0) {
            if (/https\:\/\/telegram\.me\/[a-z0-9_]{5,}/i.test(input)) {
                console.log(input);
                players.setTelegram(card.player, input);
            }
            else {
                return Promise.reject({ message: 'Input should contain a Telegram profile link for this card', id: id });
            }
        }
        else {
            return Promise.reject({ message: 'Input should not be empty for this card', id: id });
        }
    }

    card.played = true;
}, input);

const flipCard = id => applyActionToCard(id, function(card) {
    card.flipped = true;
});

const flipCardAsCompetitor = id => applyActionToCard(id, function(card) {
    card.competitor_flipped = true;
});

const winCard = id => applyActionToCard(id, function(card) {
    card.won = true;

    if (card.competitor_won != undefined && !card.competitor_won) {
        card.played = true;
    }
});

const winCardAsCompetitor = id => applyActionToCard(id, function(card) {
    card.competitor_won = true;

    if (card.won != undefined && !card.won) {
        card.played = true;
    }
});

const looseCard = id => applyActionToCard(id, function(card) {
    card.won = false;

    if (card.competitor_won != undefined && card.competitor_won) {
        card.played = true;
    }
});

const looseCardAsCompetitor = id => applyActionToCard(id, function(card) {
    card.competitor_won = false;

    if (card.won != undefined && card.won) {
        card.played = true;
    }
});

const feedCards = () => db.c.then(c => db.cards
    .changes({ includeInitial: true })
    .run(c));


module.exports = {
    loadAllByPlayer: loadCardsByPlayer,
    loadAllByCompetitor: loadCardsByCompetitor,
    loadAll: loadAllCards,
    feedAll: feedCards,
    play: playCard,
    flip: flipCard,
    win: winCard,
    loose: looseCard,
    flipAsCompetitor: flipCardAsCompetitor,
    winAsCompetitor: winCardAsCompetitor,
    looseAsCompetitor: looseCardAsCompetitor,
    dealInitialByPlayer: dealInitialCardsByPlayer,
    dealRegularByPlayer: dealRegularCardsByPlayer
};