'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');

const app = express();

app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.dnsPrefetchControl({ allow: false }));
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    dnsPrefetchControl: false,
    referrerPolicy: false
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(`${process.cwd()}/public`));
app.use('/api', apiRoutes);

app.route('/').get((req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.route('/b/:board').get((req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.route('/b/:board/:threadid').get((req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.use((req, res) => {
  res.status(404).type('text').send('Not found');
});

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

module.exports = app;
