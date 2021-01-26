'use strict';
// Copyright 2021 Spearhead Systems S.R.L.

const mod_restify = require('restify');
const mod_cueball = require('cueball');
const mod_crypto = require('crypto');
const mod_fs = require('fs');
const mod_sdcauth = require('smartdc-auth');


// Globals that are assigned to by main(). They are used by proxy() and login().
let CONFIG = {};
let PRIVATE_KEY = '';
let CLOUDAPI = {};
let SIGNER = {};


// Take any HTTP request that has a token, sign that request  with an
// HTTP-Signature header, and pass it along to cloudapi. Return any response
// from cloudapi to our client caller. Effectively this function is a proxy
// that solely signs the request as it passes through.
function proxy(req, res, cb) {
    // return data from cloudapi to the client caller
    function proxyReturn(err, _, res2, data) {
        if (err && !res2.statusCode) {
            res.send(500);
            return cb();
        }

        // bypass the convenient send() method to avoid a serialization step
        res.writeHead(res2.statusCode, res2.headers);
        res.write(data);
        res.end();

        return cb();
    }

    // check the X-Auth-Token is present
    if (req.header('X-Auth-Token') == undefined) {
        res.send({"Error": "X-Auth-Token header missing"});
        res.send(401);
        return cb();
    }

    // sign the request before forwarding to cloudapi
    let headers = req.headers;
    var rs = mod_sdcauth.requestSigner({ sign: SIGNER });
    headers.date = rs.writeDateHeader();
    rs.writeTarget(req.method, req.url);

    rs.sign(function signedCb(err, authz) {
        if (err) {
            return (cb(err));
        }

        headers.authorization = authz;

        const opts = {
            path: req.url,
            headers: headers
        };

        // make the call to cloudapi
        switch (req.method) {
            case 'GET':  CLOUDAPI.get(opts,  proxyReturn); break;
            case 'DEL':  CLOUDAPI.del(opts,  proxyReturn); break;
            case 'HEAD': CLOUDAPI.head(opts, proxyReturn); break;
            case 'POST': CLOUDAPI.post(opts, req.body, proxyReturn); break;
            case 'PUT':  CLOUDAPI.del(opts,  req.body, proxyReturn); break;
        }
    });
}


// Redirect to SSO with (signed) details that the SSO will need to generate a
// secure token. Once the user successfully logs in, the token is returned
// through an SSO redirect to token() below.
function login(req, res, cb) {
    const query = {
        permissions: '{"cloudapi":["/my/*"]}',
        returnto: CONFIG.urls.local + '/token',
        now: new Date().toUTCString(),
        keyid: '/' + CONFIG.key.user + '/keys/' + CONFIG.key.id,
        nonce:  mod_crypto.randomBytes(15).toString('base64')
    };
  
    // the query args MUST be sorted for SSO to validate
    const querystr = Object.keys(query).sort().map(function encode(key) {
        return key + '=' + encodeURIComponent(query[key]);
    }).join('&');

    let url = CONFIG.urls.sso + '/login?' + querystr;

    const signer = mod_crypto.createSign('sha256');
    signer.update(encodeURIComponent(url));
    const signature = signer.sign(PRIVATE_KEY, 'base64');
    url += '&sig=' + encodeURIComponent(signature);

    res.redirect(url, cb);
}


// Once a user successfully logs in, they are redirected to here. We convert
// the token that was returned to use as query arg into an X-Auth-Token header
// that is returned to the client caller. This header must be provided by the
// client from now on in order to communicate with Cloudapi.
function token(req, res, cb) {
    const token = decodeURIComponent(req.query().split('=')[1]);
    res.header('X-Auth-Token', token);
    res.send(204);
    return cb();
}


// Start up HTTP server and pool of cloudapi clients.
//
// Read from config file, establish crypto singer needed for requests to
// cloudapi, prepare pool of HTTP clients for communication to cloudapi, and
// start up HTTP server.
function main() {
    // load config and private key
    const configStr = mod_fs.readFileSync(process.argv[2]);
    CONFIG = JSON.parse(configStr);
    PRIVATE_KEY = mod_fs.readFileSync(CONFIG.key.path);

    // signer is used for signing requests made to cloudapi with HTTP-Signature
    SIGNER = mod_sdcauth.privateKeySigner({
        key: PRIVATE_KEY,
        keyId: CONFIG.key.id,
        user: CONFIG.key.user
    });

    // enable pool of clients to cloudapi
    CLOUDAPI = mod_restify.createStringClient({
        url: CONFIG.urls.cloudapi,
        agent: new mod_cueball.HttpsAgent({
            spares: 4,
            maximum: 10,
            recovery: {
                default: {
                    timeout: 2000,
                    retries: 5,
                    delay: 250,
                    maxDelay: 1000
                }
            }
        })
    });

    // prepare HTTP server
    const options = {
        key: mod_fs.readFileSync(CONFIG.server.key),
        cert: mod_fs.readFileSync(CONFIG.server.cert)
    };

    const server = mod_restify.createServer(options);
    server.use(mod_restify.authorizationParser());
    server.use(mod_restify.bodyParser());

    // where to server static content from
    server.get(/^\/static.*/, mod_restify.plugins.serveStatic({
        directory: 'static',
        default: 'index.html'
    }));
 
    // route HTTP requests to proper functions
    server.get('/login',  login);
    server.get('/token',  token);

    server.get(/^/,  proxy);
    server.put(/^/,  proxy);
    server.del(/^/,  proxy);
    server.post(/^/, proxy);
    server.head(/^/, proxy);

    // enable HTTP server
    server.listen(CONFIG.server.port, function listening() {
        console.log('%s listening at %s', server.name, server.url);
    });
}


main();
