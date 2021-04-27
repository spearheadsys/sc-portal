# Installing in Production

Be familiar with the steps in [Installation][] below, since it is needed to
build the Angular app first.

Once the Angular app is built, provision a small base-64-lts 20.4.0 VM,
connected solely to the external network (aka public Internet). It should
(although does not require) two JSON hash tables in the VM's internal\_metadata:
sc:image\_subscription\_rates and sc:package\_rates; both map UUID strings to
floats, with the image float representing a monthly subscription rate, and the
package float representing the rate per hour.

Once the VM is running, the following steps are needed from within the VM:

    pkgin in gmake
    mkdir -p /opt/spearhead/portal

From this repo, copy in bin/, cfg/, smf/, static/ (since this is a symlink,
this means the build in app/dist should be copied into static/ in prod), and \*.
Notably, avoid app/ and node\_modules. In production, adjust the config in
/opt/spearhead/portal/cfg/prod.json. Lastly:

    pushd /opt/spearhead/portal
    npm install
    svccfg import smf/service.xml
    svcadm enable portal
    popd

The application will now be running.

# Installation

First install the server-side libraries:

    npm install

Then install the Angular compiler needed for the client-side app:

    npm install -g @angular/cli
    pushd app && npm install && popd

## Build the client-side app:

    pushd app && npm run build && popd

## Generate server certificates

    pushd config
    openssl genrsa -out key.pem
    openssl req -new -key key.pem -out csr.pem
    openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
    rm csr.pem
    popd

## Configuration

Ensure the config file in config/ matches your details. If running in
production, name the config file config/prod.json.

Relevant configuration attributes:

- server.port: the port this server will serve the app from
- server.key: path to the private key for TLS
- server.cert: path to the PKIX certificate for TLS
- urls.local: the domain or IP the SSO will redirect back to (aka this server)
- urls.sso: the URL to the SSO
- urls.cloudapi: the URL to cloudapi
- key.user: name of Triton user who has "Registered Developer" permission set
- key.id: SSH fingerprint of Triton user (same as what node-triton uses)
- key.path: path to private key of Triton user

The SSH key used must be the correct format, e.g. generated with:

    ssh-keygen -m PEM -t rsa -C "your@email.address"

## Running the server

    node bin/server.js config/prod.json

The server generates a lot of JSON data about every request. This is easier
for a human to handle if they have bunyan installed ("npm install -g bunyan"),
and instead:

    node bin/server.js config/prod.json | bunyan

# Endpoints

## GET /\*

This is where all the front-end code goes. All files will be served as-is as
found in that directory (by default a symlink from static/ to app/dist). The
default is static/index.html. There is no authentication; all files are public.

## GET /api/login

Call this endpoint to begin the login cycle. It will redirect you to the SSO
login page: an HTTP 302, with a Location header.

## GET/POST/PUT/DELETE/HEAD /api/\*

All calls will be passed through to cloudapi. For these calls to succeed,
they MUST provide an X-Auth-Token header, containing the token returned from
SSO.

## GET /rates/packages.json

Returns a JSON file mapping package UUIDs (a string) to the hourly rate
(a float) that a customer will be charged for running a VM using that package.
This is charged fractionally down to a minute granularity.

## GET /rates/images.json

Returns a JSON file mapping image UUIDs (a string) to the monthly rate
(a float) that a customer will be charged for running a VM using that image.
This is a flat monthly charge, regardless how long the VM exists for (even if
only a few minutes).

# Interaction cycle

    client --- GET /api/login --------> this server
           <-- 302 Location #1 ----

    client --- GET <Location #1> --> SSO server
           <separate SSO cycle>
           <-- 302 with token query arg

From now on call this server as if it were a cloudapi server (using [cloudapi
paths](https://github.com/joyent/sdc-cloudapi/blob/master/docs/index.md#api-introduction)),
except prefixing any path with "/api". Also always provide the X-Auth-Token.

For example, to retrieve a list of packages:

    client --- GET /api/my/packages --> this server
           <-- 200 JSON body ------

The most useful cloudapi endpoints to begin with will be ListPackages,
GetPackage, ListImages, GetImage, ListMachines, GetMachine, CreateMachine and
DeleteMachine (see cloudapi docs).
