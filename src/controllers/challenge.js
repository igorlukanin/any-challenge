const config = require('config');
const Promise = require('promise');
const router = require('express').Router();
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
        res.status(400).send();
    }
    else {
        players
            .loadByEmail(emails[0].replace('@kontur.ru', '@skbkontur.ru'))
            .then(players => {
                if (players.length != 1) {
                    res.status(400).send();
                }
                else {
                    mailer.sendLinks(players);
                    res.status(200).send();
                }
            });
    }
});

// router.get('/:id/players', (req, res) => {
//     const id = req.params.id;
//
//     const thisChallenge = challenges.load(id);
//
//     const thisPlayers = thisChallenge
//         .then(challenge => players.loadAll(challenge.players));
//
//     Promise
//         .all([ thisChallenge, thisPlayers ])
//         .then(([ challenge, players ]) => res.render('challenge/one', { challenge, players }))
//         .catch(err => res.render('errors/index', { err }));
// });

router.get('/:id', (req, res) => {
    const id = req.params.id;

    challenges.load(id)
        .then(challenge => res.render('challenge/dashboard', {
            challenge,
            ws: {
                host: config.get('ws.host'),
                port: config.get('ws.port')
            }
        }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;