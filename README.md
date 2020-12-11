<br />
<div align="center">
  <img alt="styled-components" src="https://www.gstatic.com/alkali/apps/bento/images/characters.png" height="150px" />
</div>

# PE Crawler

PE Crawler est un système d'API automatisé permettant de récupérer les threads de différents produits de Google.
De plus, il permet également la récupération des données des fiches du centre d'aide des différents produits (e.g: YouTube, Chrome,..).
Les données sont ensuite servi sur un serveur express.

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
GET /answers/product?hl=fr 
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
GET /answers/product?hl=fr 
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
GET /threads/product?hl=fr 
```
