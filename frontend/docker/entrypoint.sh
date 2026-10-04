#!/bin/sh
set -e

# Starts as root and drops to the owner of the mounted code, so files created in
# the repository (.next, shadcn components) belong to the host user.
uid=$(stat -c %u /app)
gid=$(stat -c %g /app)

if [ "$uid" != "0" ]; then
    # The node_modules named volume is created as root; hand it to the same user.
    mkdir -p node_modules
    [ "$(stat -c %u node_modules)" = "$uid" ] || chown -R "$uid:$gid" node_modules
    run="su-exec $uid:$gid"
else
    run=""
fi

# Installs dependencies when the node_modules volume is empty.
[ -d node_modules/next ] || $run npm ci

exec $run "$@"
