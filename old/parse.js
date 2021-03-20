const bson = require('bson');

var offset = 0;

function readByte(data) {
  const value = data.readUInt8(offset);
  offset += 1;
  return value;
}

function readInt32(data) {
  const value = data.readInt32LE(offset);
  offset += 4;
  return value;
}

function readInt64(data) {
  const value = data.readDoubleLE(offset);
  offset += 8;
  return value;
}

function readUInt32(data) {
  const value = data.readUInt32LE(offset);
  offset += 4;
  return value;
}

function readCString(data) {
  var cstring = "";
  for(;;) {
    var byte = String.fromCharCode(data[offset]);
    cstring += byte;
    offset++;
    if (byte == '\0') {
      break;
    }
  }
  return cstring;
}

function toBinary(dec) {
  return (dec >>> 0).toString(2);
}

//all functions from parseHeader() to parseMessage() are for turning data into javascript objects
function Header(data) {
  this.messageLength = readInt32(data);
  this.requestID = readInt32(data);
  this.responseTo = readInt32(data);
  this.opCode = readInt32(data);
}

function OpReply(data) {
  this.responseFlags = readInt32(data);
  this.cursorID = readInt64(data);
  this.startingFrom = readInt32(data);
  this.numberReturned = readInt32(data);
  var docs = [];
  bson.deserializeStream(data, offset, this.numberReturned, docs, 0);
  this.documents = docs;
}

function OpUpdate(data) {
  this.ZERO = readInt32(data);
  this.fullCollectionName = readCString(data);
  this.flags = toBinary(readInt32(data));
  var sel = [];
  var up = [];
  offset = bson.deserializeStream(data, offset, 1, sel, 0);
  this.selector = sel;
  offset = bson.deserializeStream(data, offset, 1, up, 0);
  this.update = up;
}

function OpInsert(data) {
  this.flags = readInt32(data);
  this.fullCollectionName = readCString(data);
  var docs = [];
  while (offset < data.length) {
    var thisDoc;
    offset = bson.deserializeStream(data, offset, 1, up, 0);
    docs.push(thisDoc);
  }
  this.documents = docs;
}

function OpQuery(data) {
  this.flags = toBinary(readInt32(data));
  this.fullCollectionName = readCString(data);
  this.numberToSkip = readInt32(data);
  this.numberToReturn = readInt32(data);
  var que = [];
  offset = bson.deserializeStream(data, offset, 1, que, this.numberToSkip);
  this.query = que;
  if (offset < data.length) {
    var ret = [];
    bson.deserializeStream(data, offset, 1, ret, this.numberToSkip);
    this.returnFieldsSelector = ret;
  }
}

function OpGetMore(data) {
  this.ZERO = readInt32(data);
  this.fullCollectionName = readCString(data);
  this.numberToReturn = readInt32(data);
  this.cursorID = readInt64(data);
}

function OpDelete(data) {
  this.ZERO = readInt32(data);
  this.fullCollectionName = readCString(data);
  this.flags = toBinary(readInt32(data));
  var sel = [];
  bson.deserializeStream(data, offset, 1, sel, 0);
  this.selector = sel;
}

function OpKillCursors(data) {
  this.ZERO = readInt32(data);
  this.numberOfCursorIds = readInt64(data);
  var ids = [];
  for (var i = 0; i < this.numberOfCursorIds; i++) {
    const newId = readInt64(data);
    ids.push(newId);
  }
  this.cursorIDs = ids;
}

function OpMsg(data) {
  this.flagBits = toBinary(readUInt32(data));
  var secs = [];
  while (offset < data.length - 4) {
    const kind = readByte(data);
    if (kind === 0) {
      var body = [];
      offset = bson.deserializeStream(data, offset, 1, body, 0);
      secs.push({sectionKind: kind, sectionBody: body})
    }
    else if (kind === 1) {
      const size = readInt32(data);
      const end = offset + size - 4;
      const id = readCString(data);
      var docs = [];
      while (offset < end) {
        offset = bson.deserializeStream(data, offset, 1, docs, 0);
      }
      secs.push({sectionKind: kind, sectionSize: size, sequenceId: id, sequence: docs});
    }
    else {
      throw new Error("Invalid section kind in OP_MSG (must be 0 or 1, received " + kind + ")");
    }
  }
  this.sections = secs;
  
  if (offset < data.length) {
    this.checksum = readUInt32(data);
  }
}

exports.parseMessage = function(msg) {
  offset = 0;

  const header = new Header(msg);

  var body = {};
  var shortMsg = "";

  switch (header.opCode) {
    case 1: //
      body = new OpReply(msg);
      var okays = [];
      for (doc of body.documents) {
        okays.push(doc.ok);
      }
      shortMsg = "REPLY from database." + 
                 " OKAY(S): " + JSON.stringify(okays);
      break;
    case 2001: //OP_UPDATE
      body = new OpUpdate(msg);
      const upsert = (body.flags[0] === "1");
      const multiUpdate = (body.flags[1] === "1");
      shortMsg = "UPDATE request." + 
                 " COLLECTION NAME: " + JSON.stringify(body.fullCollectionName) +  
                 " SELECTOR: " + JSON.stringify(body.query) + 
                 " UPDATE: " + JSON.stringify(body.update) + 
                 " UPSERT?: " + upsert + 
                 " MULTI UPDATE?: " + multiUpdate;
      break;
    case 2002: //OP_INSERT
      body = new OpInsert(msg);
      shortMsg = "INSERT request." + 
                 " COLLECTION NAME: " + JSON.stringify(body.fullCollectionName) + 
                 " DOCUMENTS: " + JSON.stringify(body.documents);
      break;
    case 2003: //RESERVED, formally OP_GET_BY_OID
      throw new Error("Opcode 2003 is reserved");
    case 2004: //OP_QUERY
      body = new OpQuery(msg);
      shortMsg = "QUERY request." + 
                 " COLLECTION NAME: " + JSON.stringify(body.fullCollectionName) + 
                 " QUERY: " + JSON.stringify(body.query);
      break;
    case 2005: //OP_GET_MORE
      body = new OpGetMore(msg);
      shortMsg = "GET MORE request." + 
                 " COLLECTION NAME: " + JSON.stringify(body.fullCollectionName);
      break;
    case 2006: //OP_DELETE
      body = new OpDelete(msg);
      const singleRemove = (body.flags[0] === "1");
      shortMsg = "DELETE request." + 
                 " COLLECTION NAME: " + JSON.stringify(body.fullCollectionName) + 
                 " SELECTOR: " + JSON.stringify(body.selector) + 
                 " SINGLE REMOVE?: " + singleRemove;
      break;
    case 2007: //OP_KILL_CURSORS
      body = new OpKillCursors(msg);
      shortMsg = "KILL CURSORS request."
      break;
    case 2013: //OP_MSG
      body = new OpMsg(msg);
      const sections = body.sections;
      shortMsg = "Generic message (OP_MSG)." + 
                " SECTIONS: " + JSON.stringify(sections);
      break;
    default:
      throw new Error("Invalid opcode " + header.opCode); 
  }

  const message = Object.assign({}, header, body);

  return [message, shortMsg]

}