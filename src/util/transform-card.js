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


module.exports = transformScores;