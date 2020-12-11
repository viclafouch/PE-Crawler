<br />
<div align="center">
  <img alt="styled-components" src="https://www.gstatic.com/alkali/apps/bento/images/characters.png" height="150px" />
</div>

# PE Crawler

PE Crawler is an automated API system for retrieving threads from various Google products.
Moreover, it also allows to retrieve data from the help center of different products (e.g.: YouTube, Chrome,...).
The data are then served on an express server.

# Features 

* No registration
* Zero-config
* Basic API
* "Has many" relationships
* Filters and nested resources
* Supports GET, POST
* HTTPS
* Compatible with React, Angular, Vue, Ember, ...

## Install

```bash
$ npm install
$ npm run dev
```

Might need to run
```
npm audit fix
```

### End-points

#### For getting all products:
```
GET /products
```

#### For getting all languages:
```
GET /languages
```

#### For getting number of answers in total:
```
GET /answers
```

#### For getting answers by product code (e.g: 'youtube') :
```
GET /answers/youtube
```

#### For getting answers by product code (e.g: 'youtube') and language locale (e.g: 'fr'):
```
GET /answers/youtube?hl=fr 
```

#### For getting a pagination for answers by filtering by language, search value, and products id:
```
POST /answers/youtube
```

```js
body {
  hl: 'fr',
  page: 2,
  search: 'foo',
  products_id: [3, 9]
}
```

#### For getting number of threads in total:
```
GET /threads
```

#### For getting threads by product code (e.g: 'youtube') :
```
GET /threads/youtube
```

#### For getting threads by product code (e.g: 'youtube') and language locale (e.g: 'fr'):
```
GET /threads/youtube?hl=fr 
```

## Contributing

Any contributions and/or pull requests would be welcome.

## License

MIT License.
