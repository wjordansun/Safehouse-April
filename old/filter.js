

//returns undefined when a key can't be found recursively in an object
function findKeyInObject(object, searchKey) {
    if (typeof object !== "object") {
        return undefined;
    }
    for (const key of Object.keys(object)) {
        if (key === searchKey) {
            return key;
        }
        else if (findKeyInObject(object[key], searchKey) !== undefined) {
            return key;
        }
    }

    return undefined;
}

//return true if the message contains operators other than $db (searches recursively)
function containsOperators(object) {
    if (typeof object !== "object") {
        return false;
    }
    for (const key of Object.keys(object)) {
        //console.log(key.indexOf("$"))
        if (key.indexOf("$") > -1 && key !== "$db") {
            return true;
        }
        else if (containsOperators(object[key])) {
            return true;
        }
    }
    return false;
}


exports.validateProxyBehavior = function(proxy_behavior) {
    if (typeof proxy_behavior !== "object" || Array.isArray(proxy_behavior)) {
        return false;
    }
    return true;
}

//function returns true when client should be proxied to honeypot
exports.filterMsg = function(addr, port, message, proxy_behavior) {

    //return true if one of the keys in "required_keys" does not appear in the message
    if (Array.isArray(proxy_behavior["required_keys"])) {
        for (const keyword of proxy_behavior["required_keys"]) {
            if (findKeyInObject(message, keyword) === undefined) {
                return true;
            }
        }
    }

    //return true if one of the keys in "forbidden_keys" does appear in the message
    if (Array.isArray(proxy_behavior["forbidden_keys"])) {
        for (const keyword of proxy_behavior["forbidden_keys"]) {
            if (findKeyInObject(message, keyword) !== undefined) {
                return true;
            }
        }
    }

    //return true if the message contains operators other than $db
    if (proxy_behavior["forbid_operators"] === true) {
        if (containsOperators(message)) {return true};
    }

    //return true if ip matches forbidden ones
    if (Array.isArray(proxy_behavior["forbidden_ips"])) {
        for (const ip of proxy_behavior["forbidden_ips"]) {
            if (ip === addr) {
                return true;
            }
        }
    }

    return false;
}

