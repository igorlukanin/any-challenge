const config = require('config');


// Loosing is an option — you don't get punished for trying,
// but if you skip a card, you get a fine (negative score)
const transformScores = card => {
    card.scores = {
        play: card.score,
        win: card.score,
        loose: 0,
        skip: -Math.round(card.score / 2)
    };

    delete card.score;
    return card;
};

// If there's no emoji, add default one
const transformEmoji = card => {
    card.emoji = card.emoji || config.get('game.cards.emoji');
    return card;
};


module.exports = card => transformScores(transformEmoji(card));