const config = require('config');
const io = require('socket.io');

const cards = require('./models/card');
const challenges = require('./models/challenge');
const players = require('./models/player');
const log = require('./util/log');


process.on('uncaughtException', (err) => console.error(err.stack));
require('promise/lib/rejection-tracking').enable({ allRejections: true });


// TODO: Remove code duplicates
// TODO: +duplicate
var calculateScoreForCard = function(card) {
    return (card.played && card.solo ? card.scores.play : 0) +
        (card.played && card.own && card.won ? card.scores.win : 0) +
        (card.played && card.own && !card.won ? card.scores.loose : 0) +
        (card.played && !card.own && card.competitor_won ? card.scores.win : 0) +
        (card.played && !card.own && !card.competitor_won ? card.scores.loose : 0);
};

var calculateScoreForCards = function(cards) {
    return cards.reduce(function(score, card) {
        return score + calculateScoreForCard(card);
    }, 0);
};
// TODO: -duplicate


var dashboards = [];

const addDashboard = client => dashboards.push(client);

const removeDashboard = removedClient => {
    dashboards = dashboards.filter(client =>
        client.handshake.query.t != removedClient.handshake.query.t);
};

const notifyDashboards = (challengeId, namespace, data) => dashboards
    .filter(client => client.handshake.query.challenge == challengeId)
    .forEach(client => client.emit(namespace, data));

const pushPlayersToDashboard = challengeId => {
    challenges.load(challengeId)
        .then(challenge => players.loadAll(challenge.players))
        .then(players => Promise.all(players.map(player => cards.loadAll(player.id).then(hisCards => {
                player.score = calculateScoreForCards(hisCards);
                delete player.id;
                return player;
            }))))
        .then(players => players.filter(player => player.score > 0))
        .then(players => {
            players.sort((one, two) => two.score - one.score);
            return players;
        })
        .then(players => notifyDashboards(challengeId, 'players', players));
};

const pushPlayersToAllDashboards = () => dashboards.forEach(client =>
    pushPlayersToDashboard(client.handshake.query.challenge));


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


var server = io()
    .listen(config.get('ws.port'));

server.of('/challenge')
    .on('connection', socket => {
        const challengeId = socket.handshake.query.challenge;

        addDashboard(socket);
        pushPlayersToDashboard(challengeId);

        socket.on('disconnect', () => removeDashboard(socket));
    });

server.of('/player')
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

        // pushCardsToPlayer(card.player);
        pushPlayersToAllDashboards();

        // if (card.type == 'initial') {
            // pushProfileUpdateToPlayer(card.player);

            // cards.loadAllByCompetitor(card.player).then(cards => cards.forEach(card => {
            //     pushCardsToPlayer(card.player);
            // }));
        // }

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