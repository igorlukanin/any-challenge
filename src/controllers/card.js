const Promise = require('Promise');
const router = require('express').Router();
const cards = require('../models/card');


router.post('/:id/play', (req, res) => {
    const id = req.params.id;

    cards.play(id)
        .then(card => res.json(card))
        .catch(err => res.status(400).json(err));
});

router.post('/:id/skip', (req, res) => {
    const id = req.params.id;

    cards.skip(id)
        .then(card => res.json(card))
        .catch(err => res.status(400).json(err));
});


module.exports = router;