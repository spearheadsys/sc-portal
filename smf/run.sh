#!/bin/sh

cd /opt/spearhead/portal

# first extract the package and image rates from VM metadata
/usr/sbin/mdata-get sc:image_subscription_rates | /usr/bin/gzip --best > static/assets/data/images.json.gz
/usr/sbin/mdata-get sc:package_rates | /usr/bin/gzip --best > static/assets/data/packages.json.gz

# start up our server
/opt/local/bin/node bin/server.js cfg/prod.json &
