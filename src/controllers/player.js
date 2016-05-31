const Promise = require('Promise');
const router = require('express').Router();
const cards = require('../models/card');
const players = require('../models/player');


router.get('/:id', (req, res) => {
    const id = req.params.id;

    const thisPlayer = players.load(id);

    const hisCards = thisPlayer
        .then(player => cards.loadAllByPlayer(player.id))
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

    const hisCardsAsCompetitor = thisPlayer
        .then(player => cards.loadAllByCompetitor(player.id))
        .then(cards => Promise.all(cards.map(card => {
            return players
                .load(card.player)
                .then(player => {
                    card.own = false;
                    card.player = player;
                    return card;
                });
        })));
    
    Promise
        .all([ thisPlayer, hisCards, hisCardsAsCompetitor ])
        .then(([ player, hisCards, hisCardsAsCompetitor ]) => res.render('player/one', {
            player,
            cards: hisCards.concat(hisCardsAsCompetitor)
        }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;