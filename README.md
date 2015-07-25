node-logf  [![Build Status](https://travis-ci.org/Bacra/node-logf.svg?branch=master)](https://travis-ci.org/Bacra/node-logf)
==================

Append log msg to file continuously. (No defined log format And fast)

## Install

```
npm i logf --save
```

## Usage

```javascript
var log = require('logf')

log(new Date, 'some msg');
log('some msg');
```
