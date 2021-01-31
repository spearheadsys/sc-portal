# Installation

    npm install

# Generate server certificates

From within the config/ directory:

    openssl genrsa -out key.pem
    openssl req -new -key key.pem -out csr.pem
    openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
    rm csr.pem

# Configuration

Ensure the config file in config/ matches your details.

The SSH key used must be the correct format, e.g. generated with:

    ssh-keygen -m PEM -t rsa -C "your@email.address"

# Running the server

    node bin/server.js config/prod.json

# Endpoints

## GET /static/*

This is where all the front-end code goes. All files will be served as-is as
found in that directory. The default is static/index.html. There is no
authentication; all files are public.

## GET /login

Call this endpoint to begin the login cycle. It will redirect you to the SSO
login page.

## GET /token

Upon successful login, the SSO login page will redirect to this endpoint. This
endpoint will return a 204, along with a X-Auth-Token header that must be saved
by the front-end code. All subsequent calls should provide this X-Auth-Token
header.

## Other

All other calls will be passed through to cloudapi. For these calls to succeed,
they MUST provide the X-Auth-Token header that the /token endpoint returns.
