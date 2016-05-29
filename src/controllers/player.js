const Promise = require('Promise');
const router = require('express').Router();
const cards = require('../models/card');
const players = require('../models/player');


router.get('/:id', (req, res) => {
    const id = req.params.id;

    const thisPlayer = players.load(id);

    const theirCards = thisPlayer
        .then(player => cards.loadAllByPlayer(player.id));
    
    Promise
        .all([ thisPlayer, theirCards ])
        .then(([ player, cards ]) => res.render('player/one', { player, cards }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;