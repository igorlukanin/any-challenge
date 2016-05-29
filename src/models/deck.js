const _ = require('lodash');

const deck = require('../../data/deck');


const getInitialCards = () => deck.filter(card => card.type == 'initial');

const dealInitialCards = dealtCards => getInitialCards()
    .filter(initialCard => !dealtCards
        .reduce((dealt, card) => dealt || card.type_id == initialCard.type_id, false));


module.exports = {
    getInitial: getInitialCards,
    dealInitialCards: dealInitialCards
};