#!/bin/sh

cd /opt/spearhead/portal

# first extract the package and image rates from VM metadata
/usr/sbin/mdata-get sc:image_subscription_rates > rates/images.json
/usr/sbin/mdata-get sc:package_rates > rates/packages.json

# start up our server
/opt/local/bin/node bin/server.js cfg/prod.json &
