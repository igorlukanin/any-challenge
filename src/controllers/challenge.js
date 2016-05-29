const Promise = require('Promise');
const router = require('express').Router();
const challenges = require('../models/challenge');
const players = require('../models/player');


const parseEmails = emails => emails.split(/;\r?\n\r?/);

const parseParams = (title, emailString) => new Promise((resolve, reject) => {
    if (title == undefined || title.length == 0) { reject('title'); }
    else if (emailString == undefined || emailString.length == 0) { reject('emails'); }

    const emails = parseEmails(emailString);

    if (emails.length == 0) { reject('emails'); }
    else { resolve({ title, emails }); }
});


router.get('/', (req, res) => res.render('challenge/add'));

router.post('/', (req, res) => {
    const title = req.body.title;
    const emails = req.body.emails;

    parseParams(title, emails)
        .then(({ title, emails }) => Promise.all([ title, players.createAll(emails) ]))
        .then(([ title, playerIds ]) => challenges.create(title, playerIds))
        .then(challengeId => res.redirect('/challenge/' + challengeId))
        .catch(err => res.render('errors/index', { err }));
});

router.get('/:id', (req, res) => {
    const id = req.params.id;

    const challenge = challenges.load(id);

    const players = challenge
        .then();

    Promise
        .all()
        .then(challenge => res.render('challenge/one', { challenge }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;