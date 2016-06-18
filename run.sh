#!/bin/bash
#
phantomjs --ssl-protocol=any --cookies-file=cookies.txt $1.js
