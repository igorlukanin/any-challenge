const config = require('config');
const io = require('socket.io');
const Promise = require('Promise');

const cards = require('./models/card');
const players = require('./models/player');
const log = require('./util/log');
const pronounce = require('./util/pronounce');


process.on('uncaughtException', (err) => console.error(err.stack));
require('promise/lib/rejection-tracking').enable({ allRejections: true });


var clients = [];

const addClient = client => clients.push(client);

const removeClient = removedClient => {
    clients = clients.filter(client =>
        client.handshake.query.player == removedClient.handshake.query.player);
};

const notifyPlayer = (playerId, cards) => clients
    .filter(client => client.handshake.query.player == playerId)
    .forEach(client => client.emit('cards', cards));

const loadCards = playerId => {
    const hisCards = cards
        .loadAllByPlayer(playerId)
        .then(cards => Promise.all(cards.map(card => {
            card.own = true;

            if (card.solo) {
                return card;
            }
            else {
                return players
                    .load(card.competitor)
                    .then(competitor => {
                        card.competitor = competitor;
                        return card;
                    });
            }
        })));

    const hisCardsAsCompetitor = cards
        .loadAllByCompetitor(playerId)
        .then(cards => Promise.all(cards.map(card => {
            return players
                .load(card.player)
                .then(player => {
                    card.own = false;
                    card.player = player;
                    return card;
                });
        })));

    return Promise
        .all([ hisCards, hisCardsAsCompetitor ])
        .then(([ hisCards, hisCardsAsCompetitor ]) => hisCards.concat(hisCardsAsCompetitor))
        .then(cards => {
            cards.sort((one, two) =>
                (one.priority || one.creation_date.getTime()) -
                (two.priority || two.creation_date.getTime()));
            return cards;
        })
        .catch(err => res.render('errors/index', { err }));
};

const pushCardsToPlayer = playerId => loadCards(playerId)
    .then(cards => notifyPlayer(playerId, cards));


log.appState('dealer', 'ready to deal cards');

io()
    .listen(config.get('ws.port'))
    .of('/cards')
    .on('connection', socket => {
        const playerId = socket.handshake.query.player;

        addClient(socket);
        pushCardsToPlayer(playerId);

        socket.on('disconnect', () => removeClient(socket));
    });

players
    .feedAll()
    .then(cursor => cursor.each((err, result) => {
        var player = result.new_val;

        if (!player) {
            return;
        }

        log.playerInfo(player, 'in game');

        const deal = () => cards
            .dealInitialByPlayer(player.id)
            .then(cards => {
                if (cards.length > 0) {
                    pushCardsToPlayer(player.id);

                    log.playerInfo(player, 'gets ' + pronounce(cards.length, 'initial card'));
                }
            })
            .catch(err => console.error(err));

        deal();
    }))
    .catch(err => console.error(err));

cards
    .feedPlayedOrSkipped()
    .then(cursor => cursor.each((err, result) => {
        var card = result.new_val;

        if (!card) {
            return;
        }

        const deal = () => cards
            .dealRegularByPlayer(card.player)
            .then(cards => {
                if (cards.length > 0) {
                    pushCardsToPlayer(card.player);
                    
                    log.playerInfo(card.player, 'gets ' + pronounce(cards.length, 'regular card'));

                    // Try to deal one more card
                    deal();
                }
            })
            .catch(err => console.error(err));

        deal();
    }))
    .catch(err => console.error(err));