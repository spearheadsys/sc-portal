'use strict';
// Copyright 2021 Spearhead Systems S.R.L.

const mod_restify = require('restify');
const mod_cueball = require('cueball');
const mod_crypto = require('crypto');
const mod_fs = require('fs');
const mod_sdcauth = require('smartdc-auth');
const mod_bunyan = require('bunyan');


// Globals that are assigned to by main(). They are used by proxy() and login().
let CONFIG = {};
let PRIVATE_KEY = '';
let CLOUDAPI = {};
let CLOUDAPI_HOST = '';
let SIGNER = {};

const LOGIN_PATH = '/api/login';
const API_PATH = '/api'; // all calls here go to cloudapi
const API_RE = new RegExp('^' + API_PATH + '/');
const STATIC_RE = new RegExp('^/');

// Take any HTTP request that has a token, sign that request  with an
// HTTP-Signature header, and pass it along to cloudapi. Return any response
// from cloudapi to our client caller. Effectively this function is a proxy
// that solely signs the request as it passes through.
function proxy(req, res, cb) {
    // return data from cloudapi to the client caller
    function proxyReturn(err, _, res2, data) {
        if (err && !res2) {
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
        res.send({'Error': 'X-Auth-Token header missing'});
        res.send(401);
        return cb();
    }

    // strip off /api from path before forwarding to cloudapi
    let url = req.url.substr(API_PATH.length);

    // sign the request before forwarding to cloudapi
    let headers = req.headers;
    var rs = mod_sdcauth.requestSigner({ sign: SIGNER });
    headers.date = rs.writeDateHeader();
    rs.writeTarget(req.method, url);

    rs.sign(function signedCb(err, authz) {
        if (err) {
            return (cb(err));
        }

        headers.host = CLOUDAPI_HOST;
        headers.authorization = authz;

        const opts = {
            path: url,
            headers: headers
        };

        // make the call to cloudapi
        switch (req.method) {
            case 'GET':    CLOUDAPI.get(opts,  proxyReturn); break;
            case 'DELETE': CLOUDAPI.del(opts,  proxyReturn); break;
            case 'HEAD':   CLOUDAPI.head(opts, proxyReturn); break;
            case 'POST':   CLOUDAPI.post(opts, req.body, proxyReturn); break;
            case 'PUT':    CLOUDAPI.put(opts,  req.body, proxyReturn); break;
        }
    });
}


// Redirect to SSO with (signed) details that the SSO will need to generate a
// secure token. Once the user successfully logs in, the token is returned
// through an SSO redirect to token() below.
function login(req, res, cb) {
    const query = {
        permissions: '{"cloudapi":["/my/*"]}',
        returnto: CONFIG.urls.local,
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

    res.json({ url });
}


// Logging function useful to silence bunyan-based logging systems
function silentLogger() {
    let stub = function () {};

    return {
        child: silentLogger,
        warn:  stub,
        trace: stub,
        info:  stub,
        debug: stub
    }
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
            log: silentLogger(), // temporary
            spares: 2,
            maximum: 5,
            ping: '/',
            pingInterval: 5000, // in ms
            recovery: {
                default: {
                    timeout: 2000,
                    retries: 2,
                    delay: 250,
                    maxDelay: 1000
                }
            }
        })
    });

    CLOUDAPI_HOST = CONFIG.urls.cloudapi.split('/')[2];

    // prepare HTTP server
    const options = {
        key: mod_fs.readFileSync(CONFIG.server.key),
        cert: mod_fs.readFileSync(CONFIG.server.cert)
    };

    const server = mod_restify.createServer(options);
    server.use(mod_restify.requestLogger());
    server.use(mod_restify.authorizationParser());
    server.use(mod_restify.bodyReader());

    // log requests
    server.on('after', mod_restify.auditLogger({
        log: mod_bunyan.createLogger({ name: 'proxy' })
    }));

    // login path is /api/login
    server.get(LOGIN_PATH,  login);

    // all cloudapi calls are proxied through /api
    server.get(API_RE,  proxy);
    server.put(API_RE,  proxy);
    server.del(API_RE,  proxy);
    server.post(API_RE, proxy);
    server.head(API_RE, proxy);

    // where to serve static content from
    let staticHandler = mod_restify.plugins.serveStatic({
        directory: 'static',
        default: 'index.html'
    });
    server.get(STATIC_RE, function staticFunnel(req, res, next) {
        staticHandler(req, res, function fileFound(err) {
            // If we didn't find the requested static file, serve up the
            // default (index.html) instead. This is useful when a user reloads
            // some page in the SPA, since the path does not match anything the
            // backend knows, but the SPA reloaded through index.html will know
            // what to do with the original URL.
            if (err && err.statusCode === 404) {
                req.url = '/';
                staticHandler(req, res, next);
            } else {
                next(err);
            }
        });
    });

    // enable HTTP server
    server.listen(CONFIG.server.port, function listening() {
        console.log('%s listening at %s', server.name, server.url);
    });
}


main();
