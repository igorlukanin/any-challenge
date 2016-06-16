const config = require('config');
const router = require('express').Router();
const challenges = require('../models/challenge');
const players = require('../models/player');


router.get('/:id', (req, res) => {
    const id = req.params.id;

    const thisChallenge = challenges.loadByPlayer(id);
    const thisPlayer = players.load(id);

    Promise
        .all([ thisChallenge, thisPlayer ])
        .then(([ challenge, player ]) => res.render('player/one', {
            challenge,
            player,
            ws: {
                host: config.get('ws.host'),
                port: config.get('ws.port')
            }
        }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;