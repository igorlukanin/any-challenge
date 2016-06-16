const config = require('config');
const mailer = require('nodemailer');


const transporter = mailer.createTransport({
    host: config.get('smtp.host'),
    port: config.get('smtp.port'),
    secureConnection: true,
    tls: { ciphers: 'SSLv3' },
    auth: {
        user: config.get('smtp.user'),
        pass: config.get('smtp.pass')
    }
});


const sendLinks = players => {
    players.forEach(player => {
        const link = 'http://' + config.get('proxy.host') + ':' + config.get('proxy.port') + '/players/' + player.id;

        const options = {
            from: config.get('smtp.from'),
            to: player.email,
            subject: config.get('smtp.subject'),
            text: link,
            html: '<a href="' + link + '">Чемпионат по всему</a>'
        };

        transporter.sendMail(options, (err, info) => {
            console.log(err ? err : info.response);
        });
    });
};


module.exports = {
    sendLinks
};