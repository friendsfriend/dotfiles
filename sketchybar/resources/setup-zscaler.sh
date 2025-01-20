#!/bin/bash

cd "$(dirname "$0")"
cp zscaler /etc/sudoers.d/zscaler
chmod 0600 /etc/sudoers.d/zscaler
mkdir -p /opt/scripts
cp zscaler-kill.sh /opt/scripts/zscaler-kill.sh
chmod o=rwx,g=,o= /opt/scripts/zscaler-kill.sh
