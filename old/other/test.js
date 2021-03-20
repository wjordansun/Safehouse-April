const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;

async function test() {

    //NOTICE: the public ip of the ec2 instance changes every time it's booted up!!!
    MongoClient.connect("mongodb://localhost:27016", { useNewUrlParser: true , useUnifiedTopology: true}, async function (err, client) {

    if (err) {
        console.error("ERROR: could not connect to Mongodb client");
        throw err;
    }

    console.log("connected");

    try {
        console.log(">>>>>going to database...");
        const db = client.db("test_db_12345");
    
        console.log(">>>>>going to collection...");
        const collection = db.collection("test_collection_12345");
    
        console.log(">>>>>inserting doc...");
        await collection.insertOne({field1: 1, field2: "two"}).then(doc => {console.log(doc)});
        
        console.log(">>>>>finding doc...");
        await collection.findOne({field1: 1}).then(doc => {console.log(doc)});
    
        console.log(">>>>>updating doc...");
        await collection.updateOne({field1: 1}, {$set: {"field1": 3}}).then(doc => console.log(doc));
    
        console.log(">>>>>deleting doc...");
        await collection.deleteOne({field:1}).then(doc => {console.log("deleted doc")});
    
        console.log(">>>>>dropping db...");
        await db.dropDatabase({});
        

        console.log("DONE");


    }
    catch (error) {
        console.log("ERROR!!!");
        exit(-1);
    }

    console.log("LOGGING OFF");
    client.close();
   


    });


}

test();