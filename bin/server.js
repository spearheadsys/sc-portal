const mod_restify = require('restify');
const mod_cueball = require('cueball');


const cloudapi_client = mod_restify.createStringClient({
    url: 'https://eu-ro-1.api.spearhead.cloud',
    agent: new mod_cueball.HttpsAgent({
        spares: 4, maximum: 10,
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



function proxy(req, res, cb) {
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

    const opts = {
        path: req.url,
        headers: req.headers
    };

    switch (req.method) {
        case 'GET':  cloudapi_client.get(opts,  proxyReturn); break;
        case 'DEL':  cloudapi_client.del(opts,  proxyReturn); break;
        case 'HEAD': cloudapi_client.head(opts, proxyReturn); break;
        case 'POST': cloudapi_client.post(opts, req.body, proxyReturn); break;
        case 'PUT':  cloudapi_client.del(opts,  req.body, proxyReturn); break;
    }
}


function login(req, res, cb) {
    res.send('login');
    return cb();
}


function main() {
    const server = mod_restify.createServer();
    server.use(mod_restify.authorizationParser());
    server.use(mod_restify.bodyParser());

    server.get(/^\/static.*/, mod_restify.plugins.serveStatic({
        directory: 'static',
        default: 'index.html'
    }));
 
    server.post('/login', login);

    server.get(/^/,  proxy);
    server.put(/^/,  proxy);
    server.del(/^/,  proxy);
    server.post(/^/, proxy);
    server.head(/^/, proxy);

    server.listen(8080, function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}


main();
