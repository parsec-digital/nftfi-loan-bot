#!/bin/bash

(cd src/handlers/signer; ./scripts/dist.sh)

gcloud auth application-default login

pulumi stack select ParsecDigitial/nft-art-loans-nftfi-loan-bot/dev

pulumi up

gcloud auth application-default revoke