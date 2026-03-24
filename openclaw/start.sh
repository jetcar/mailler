#!/bin/sh
set -eu

nginx
exec "$@"