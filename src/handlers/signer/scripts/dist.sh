#!/bin/bash

set -e

# Clean the dist folder
rm -rf ${PWD}/dist

# Sync files into dist folder
rsync -avL --delete ${PWD}/libs ${PWD}/dist/
rsync -av --delete ${PWD}/index.js ${PWD}/dist/
rsync -av --delete ${PWD}/package.json ${PWD}/dist/
rsync -av --delete ${PWD}/yarn.lock ${PWD}/dist/

#zip the dist directory
(cd dist; zip -r ../dist.zip *)