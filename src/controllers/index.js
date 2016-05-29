var router = require('express').Router(),

    db = require('../util/db');


router.get('/', (req, res) => {
    // db.c.then((c) => db.athletes
    //     .limit(10)
    //     .run(c)
    //     .then((cursor) => cursor.toArray())
    //     .then((athletes) => res.render('index', {
    //         athletes: athletes.map((athlete) => ({
    //             name: athlete.full_name,
    //             url: '/athletes/' + athlete.id
    //         }))}
    //     )))
    
    res.render('index');
});

router.use('/challenges', require('./challenge'));

router.use('/players', require('./player'));


module.exports = router;