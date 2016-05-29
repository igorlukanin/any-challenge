const config = require('config');

const cards = require('./models/card');
const players = require('./models/player');
const log = require('./util/log');
const pronounce = require('./util/pronounce');


process.on('uncaughtException', (err) => console.error(err.stack));
require('promise/lib/rejection-tracking').enable({ allRejections: true });


log.appState('dealer', 'ready to deal cards');

players
    .feedAll()
    .then(cursor => cursor.each((err, result) => {
        var player = result.new_val;
        log.playerInfo(player, 'in game');

        cards
            .ensureInitialCardsAreDealtByPlayer(player.id)
            .then(cards => {
                if (cards.length > 0) {
                    log.playerInfo(player, 'gets ' + pronounce(cards.length, 'card'));
                }
            });
    }))
    .catch(err => console.error(err));