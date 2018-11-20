# flickrDL
download all original files from flickr account

get started:
```
git checkout https://github.com/markisatacomputer/flickrDL.git
npm install
touch .env
echo "OAUTH_SERVICE_API_KEY=[myserviceapikey]" > .env
echo "OAUTH_SERVICE_API_SECRET=[myserviceapisecret]" > .env
echo "OAUTH_REQUEST_TOKEN_URL='https://www.flickr.com/services/oauth/request_token'" > .env
echo "OAUTH_REQUEST_AUTH_URL='https://www.flickr.com/services/oauth/authorize'" > .env
echo "OAUTH_ACCESS_TOKEN_URL='https://www.flickr.com/services/oauth/access_token'" > .env
node index.js
```