const express = require('express');
const bodyParser= require('body-parser');
const app = express();
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;

app.use(express.static('./'))

MongoClient.connect("mongodb://127.0.0.1:27016", {useUnifiedTopology: true})
  .then(client => {
    let loggedIn = false;
    console.log("Connected to database");

    const db = client.db('accounts');
    const accountsCollection = db.collection('userAndPass');

    const db1 = client.db('database_1');
    const collection_1 = db1.collection('collection_1');



    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json()); 

    app.get('/', (req, res) => {
        loggedIn = false;
        res.render('/index.ejs');
    });
    
    app.get('/loggedIn', (req, res) => {
      if (loggedIn) {
        db1.collection('collection_1').find().toArray()
 			    .then(results => {
 				    res.render('login_success.ejs', { info: results })
 			    })
          .catch(error => console.error(error))
      } else {
        res.redirect('/')
      }
            
    });
    
    app.post('/', (req, res) => {
        var query = {};
        try {
            query.username = JSON.parse(req.body.username);
            if (typeof(query.username) == "number") {query.username = query.username.toString();};
        }
        catch (e) {
            query.username = req.body.username;
        }
        try {
            query.password = JSON.parse(req.body.password);
            if (typeof(query.password) === "number") {query.password = query.password.toString();};
        }
        catch (e) {
            query.password = req.body.password;
        }

        console.log(query);

        db.collection('userAndPass').findOne(query)
        .then(result => {
            if (result) {
                loggedIn = true;
                res.redirect('/loggedIn');
            }
            else {
                res.sendFile(__dirname + '/index.html');
    
            }
        })
        .catch(error => {
            console.error(error);
            res.sendFile(__dirname + '/index.html');
        });
    });

    app.post('/loggedIn', (req, res) => {
      loggedIn = false;
      res.redirect('/');
    });
    
    app.listen(3000, function() {
        console.log('listening on 3000')
    });

})
.catch(console.error);


