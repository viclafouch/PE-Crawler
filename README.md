# Google Support Crawler (v1.0.0)

GSP (Google Support Crawler) is an unofficial project that managed 3 things :
- A crawler that will be started every 24 hours to crawl each articles of a product in a specific language. (Exemple : YouTube in french).
- A fetcher who behaves like a RSS feed. It collects the last N discussions without answer of a community in a specific language.
- An API that will be served these datas (crawler / fetcher).

## Products supported :

- Google Chrome
- Google Photos
- Google Maps
- Google AdSense
- Gmail
- YouTube
- Google Search
- Google Account
- Google Calendar
- Google Play
- Google My Business
- Google Fi
- Google Translate
- G Suite Admininistrator
- Files by Google
- Docs Editor
- Course Kit
- Google Drive

## Languages supported :

- French
- English
- Deutsch
- Português (Brasil)
- Español
- Pусский
- Yкраїнська
- Indonesia

### Installing from source

1. Clone the repository: `git clone https://github.com/viclafouch/google-support-crawler.git`
2. Install the npm dependencies `npm install`
3. Build the inject script: `npm run start`
