#!/bin/bash
#
phantomjs --ignore-ssl-errors=true --ssl-protocol=any --cookies-file=cookies.txt $1
