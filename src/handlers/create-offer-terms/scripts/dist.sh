#!/bin/bash

# Clean the dist folder
rm -rf ${PWD}/dist

# Sync files into dist folder
rsync -av --delete ${PWD}/index.js ${PWD}/dist/
rsync -av --delete ${PWD}/package.json ${PWD}/dist/
rsync -av --delete ${PWD}/yarn.lock ${PWD}/dist/
rsync -avL --delete ${PWD}/db ${PWD}/dist/
rsync -avL --delete ${PWD}/libs ${PWD}/dist/

#zip the dist directory
(cd dist; zip -r ../dist.zip *)