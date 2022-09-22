#!/bin/bash

(cd src/handlers/create-offer; ./scripts/dist.sh)

gcloud auth application-default login

pulumi stack select dev

pulumi up

gcloud auth application-default revoke