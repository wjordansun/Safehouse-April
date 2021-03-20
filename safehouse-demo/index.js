const express = require('express');
const bodyParser= require('body-parser');
const app = express();
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;

app.use(express.static('./'))

MongoClient.connect("mongodb://127.0.0.1:27016", {useUnifiedTopology: true})
.then(client => {
    console.log("Connected to database");

    const db = client.db('login_info')

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json()); 

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
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

        db.collection('login_info').findOne(query)
        .then(result => {
            if (result) {
                res.sendFile(__dirname + '/login_success.html');
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
    
    app.listen(3000, function() {
        console.log('listening on 3000')
    });

})
.catch(console.error);


