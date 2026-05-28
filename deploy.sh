#!/bin/bash
# Bind runtime secrets to the Worker before deploying.
# In Cloudflare Pages settings, set deploy command to: bash deploy.sh
set -e

echo "$META_CAPI_TOKEN" | npx wrangler secret put META_CAPI_TOKEN
echo "$META_TEST_EVENT_CODE" | npx wrangler secret put META_TEST_EVENT_CODE
npx wrangler deploy
