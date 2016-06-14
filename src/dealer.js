const config = require('config');
const io = require('socket.io');

const cards = require('./models/card');
const players = require('./models/player');
const log = require('./util/log');


process.on('uncaughtException', (err) => console.error(err.stack));
require('promise/lib/rejection-tracking').enable({ allRejections: true });


var clients = [];

const addClient = client => clients.push(client);

const removeClient = removedClient => {
    clients = clients.filter(client =>
        client.handshake.query.player != removedClient.handshake.query.player);
};

const notifyPlayer = (playerId, namespace, data) => clients
    .filter(client => client.handshake.query.player == playerId)
    .forEach(client => client.emit(namespace, data));

const pushCardsToPlayer = playerId => cards.loadAll(playerId)
    .then(cards => notifyPlayer(playerId, 'cards', cards));

const pushProfileUpdateToPlayer = playerId => players.load(playerId)
    .then(player => notifyPlayer(playerId, 'player', player));


log.appState('dealer', 'ready to deal cards');

io()
    .listen(config.get('ws.port'))
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

        log.playerInfo(player.id, 'in game');

        const deal = playerId => cards
            .dealInitialByPlayer(playerId)
            .then(cards => {
                if (cards.length > 0) {
                    pushCardsToPlayer(playerId);

                    log.playerInfo(playerId, 'gets ' + cards.length + ' initial card(s)');
                }
            })
            .catch(err => console.error(err));

        deal(player.id);
    }))
    .catch(err => log.error(err));

cards
    .feedAll()
    .then(cursor => cursor.each((err, result) => {
        var card = result.new_val;

        if (!card) {
            return;
        }

        pushCardsToPlayer(card.player);

        if (card.type == 'initial') {
            pushProfileUpdateToPlayer(card.player);

            cards.loadAllByCompetitor(card.player).then(cards => cards.forEach(card => {
                pushCardsToPlayer(card.player);
            }));
        }

        if (!card.solo) {
            pushCardsToPlayer(card.competitor);
        }

        const deal = playerId => cards
            .dealRegularByPlayer(playerId)
            .then(cards => {
                if (cards.length > 0) {
                    pushCardsToPlayer(playerId);

                    log.playerInfo(playerId, 'gets ' + cards.length + ' regular card(s)');

                    // Try to deal one more card
                    deal(playerId);
                }
            })
            .catch(err => console.error(err));

        if (card.played) {
            if (card.player) {
                deal(card.player);
            }

            if (card.competitor) {
                deal(card.competitor);
            }
        }
    }))
    .catch(err => console.error(err));