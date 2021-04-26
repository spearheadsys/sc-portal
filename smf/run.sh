#!/bin/sh

cd /opt/spearhead/portal
/opt/local/bin/node bin/server.js cfg/prod.json &
