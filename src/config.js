export const baseUrl = new URL('https://support.google.com')
export const limit = 10
export const languages = ['fr', 'en', 'es', 'de', 'pt']
export const maxThreads = [8, 15, 30]

export const products = [
  {
    forumId: 659278,
    name: 'YouTube',
    url: baseUrl.origin + '/youtube/'
  },
  {
    forumId: 697265,
    name: 'Chrome',
    url: baseUrl.origin + '/chrome/'
  },
  {
    forumId: 678735,
    name: 'Gmail',
    url: baseUrl.origin + '/mail/'
  },
  {
    forumId: 1452138,
    name: 'Adsense',
    url: baseUrl.origin + '/adsense/'
  },
  {
    forumId: 1749766,
    name: 'Google Search',
    url: baseUrl.origin + '/websearch/'
  },
  {
    forumId: 24053,
    name: 'Google Photos',
    url: baseUrl.origin + '/photos/'
  },
  {
    forumId: 593221,
    name: 'Google Maps',
    url: baseUrl.origin + '/maps/'
  },
  {
    forumId: 202587,
    name: 'Google Calendar',
    url: baseUrl.origin + '/calendar/'
  },
  {
    forumId: 553472,
    name: 'Google Account',
    url: baseUrl.origin + '/accounts/'
  },
  {
    forumId: 412208,
    name: 'Google Play',
    url: baseUrl.origin + '/googleplay/'
  }
]
