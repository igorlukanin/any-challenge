const config = require('config');
const Promise = require('promise');
const router = require('express').Router();

const cards = require('../models/card');
const challenges = require('../models/challenge');
const players = require('../models/player');
const mailer = require('../util/mailer');


const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
const parseEmails = emails => emails.match(emailRegex);

const parseParams = (title, emailString) => new Promise((resolve, reject) => {
    if (title == undefined || title.length == 0) { reject('title'); }
    else if (emailString == undefined || emailString.length == 0) { reject('emails'); }

    const emails = parseEmails(emailString);

    if (emails.length == 0) { reject('emails'); }
    else { resolve({ title, emails }); }
});

router.get('/add', (req, res) => res.render('challenge/add'));

router.post('/', (req, res) => {
    const title = req.body.title;
    const emails = req.body.emails;

    parseParams(title, emails)
        .then(({ title, emails }) => Promise.all([ title, players.createAll(emails) ]))
        .then(([ title, playerIds ]) => challenges.create(title, playerIds))
        .then(challengeId => res.redirect('/challenges/' + challengeId))
        .catch(err => res.render('errors/index', { err }));
});

router.post('/enter', (req, res) => {
    const emails = parseEmails(req.body.email);

    if (emails == null || emails.length != 1) {
        console.log('Email is null or wrong email count: ' + emails);
        res.status(400).send();
    }
    else {
        players
            .loadByEmail(emails[0].replace('@kontur.ru', '@skbkontur.ru'))
            .then(players => {
                if (players.length != 1) {
                    console.log('Wrong player count: ' + players);
                    res.status(400).send();
                }
                else {
                    mailer.sendLinks(players);
                    res.status(200).send();
                }
            });
    }
});


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

router.get('/:id', (req, res) => {
    const id = req.params.id;

    const thisChallenge = challenges.load(id);

    const thesePlayers = thisChallenge
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
        });

    Promise
        .all([ thisChallenge, thesePlayers ])
        .then(([ challenge, players ]) => {
            delete challenge.players;
            players = players.map(player => {
                delete player.id;
                return player;
            });

            res.render('challenge/dashboard', {
                challenge,
                players
            });
        });

});


module.exports = router;