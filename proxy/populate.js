const fs = require('fs');
const readline = require('readline');

//lists for sample data
const fnames = [];
const snames = [];
const cities = [];
const countries = [];
const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA",
    "WA", "WV", "WI", "WY"
];
const streets = [];


//data-generating functions
function RANDOM(args) {
    return args[Math.floor(Math.random() * args.length)];
}

function INTEGER(min, max) {
    return Math.floor((Math.random() * max) + min);
}

function FLOAT(min, max) {
    return (Math.random() * max) + min;
}

function BOOL() {
    return (Math.random < 0.5);
}

function FIRST_NAME() {
    return RANDOM(fnames);
}

function SURNAME() {
    return RANDOM(snames);
}

function FULL_NAME() {
    return RANDOM(fnames) + " " + RANDOM(snames);
}

function CITY() {
    return RANDOM(cities);
}

function STATE() {
    return RANDOM(states);
}

function COUNTRY() {
    return RANDOM(countries);
}

function STREET() {
    return RANDOM(streets);
}

///more to come....


//reads a file on disk line by line, pushes contents of each line to array
async function readLines(fileName, buffer) {
  console.log("Beginning to read from file \"" + fileName + "\"");
  const fileStream = fs.createReadStream(fileName);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    buffer.push(line);
  }
}

async function populateSampleData() {
  const fnamesPromise = readLines("sample_data/first_names.data", fnames);

  const snamesPromise = readLines("sample_data/surnames.data", snames);

  const citiesPromise = readLines("sample_data/cities.data", cities);

  const countriesPromise = readLines("sample_data/countries.data", countries);

  const streetsPromise = readLines("sample_data/streets.data", streets);

  readLinesPromise = await Promise.all([fnamesPromise, snamesPromise, citiesPromise, countriesPromise, streetsPromise])
  .catch(error => {
    console.error("ERROR: could not read from sample data");
    throw(error);
  });
}

//reads doc schema from doc_template.json and turns it into object
async function readSchema(schema) {
  return JSON.parse(fs.readFileSync(schema).toString());
}

//copy nested objects/arrays
const deepCopy = (inObject) => {
  let outObject, value, key

  if (typeof inObject !== "object" || inObject === null || inObject === undefined) {
    return inObject
  }

  outObject = Array.isArray(inObject) ? [] : {}

  for (key in inObject) {
    value = inObject[key]

    outObject[key] = deepCopy(value)
  }

  return outObject
}

//populate a doc schema object
function populateDocument(new_document) {
  for (const [key, value] of Object.entries(new_document)) {
    if (typeof value === "string") {
      new_document[key] = eval(value);
    }
    else if (typeof value === "object") {
      populateDocument(new_document[key]);
    }
  }

  return new_document;
}

//populate a collection with docs
async function populateCollection(collection, collection_template) {

  const documents = [];

  const doc_count = await collection_template.DOC_COUNT;
  const doc_template = await collection_template.DATA;

  if (!Number.isInteger(doc_count) || doc_count < 0) {
    console.error("ERROR: \"DOC_COUNT\" field in schema file is either not an unsigned integer or doesn't exist. Please revise \"schema.json\".");
  }
  else if (typeof doc_template !== "object" || Array.isArray(doc_template)) {
    console.error("ERROR: \"DATA field\" in schema file is either not an object or doesn't exist. Please revise \"schema.json\".");
  }
  else {
    for (i = 1; i <= doc_count; i++ ) {
      new_document = deepCopy(doc_template);
      populateDocument(new_document);
      documents.push(new_document);
    }

    await collection.insertMany(documents)
    .catch(error => {
      console.error("ERROR: could not insert documents.");
      throw error;
    })

  }
}

//populate a database with collections
async function populateDatabase(db, db_template) {

  for (const [key, value] of Object.entries(db_template)) {
    if (typeof value !== "object" || Array.isArray(value)) {
      console.error("ERROR: Second-level fields of schema file (representing collections) must be objects. Please revise \"schema.json\".");
    }
    else {
      collection = db.collection(key);
      collection_template = value;
      await populateCollection(collection, collection_template);
    }
  }
}

//populate an instance with databases
exports.populateInstance = async function (client, schema) {

  var schema = await readSchema(schema)
  .catch(error => {
    console.error("ERROR: could not read schema file " + schema);
    throw error;
  })

  await populateSampleData();

  console.log("Populating mongodb instance...");
  //populating databases
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value !== "object" || Array.isArray(value)) {
      console.error("ERROR: Top-level fields of schema file (representing databases) must be objects. Please revise \"schema.json\".");
    }
    else {
      const db = client.db(key);
      db_template = value;
      populateDatabasePromise = await populateDatabase(db, db_template);
    }
  }

  console.log("Finished populating mongodb instance.");

}