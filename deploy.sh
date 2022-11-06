#!/bin/bash

# Get CLI args
while getopts s: flag
do
  case "${flag}" in
    s) stage=${OPTARG};;
  esac
done

# Build dist.zip files
# (cd src/handlers/get-listings; ./scripts/dist.sh)
# (cd src/handlers/create-offer-terms; ./scripts/dist.sh)
# (cd src/handlers/create-offer; ./scripts/dist.sh)
(cd src/handlers/new-offers-pipeline; ./scripts/dist.sh)

# Deploy stack
gcloud auth application-default login

pulumi stack select ${stage}

pulumi config set gcp:project nft-art-loans-nftfi-loan-bot

pulumi refresh

pulumi up

gcloud auth application-default revoke