node-logfd  [![Build Status](https://travis-ci.org/Bacra/node-logfd.svg?branch=master)](https://travis-ci.org/Bacra/node-logfd)
==================

Append log msg to file. (No defined log format And fast)

## Install

```
npm i logfd --save
```

## Usage

```javascript
var log = require('logfd')

log(new Date, 'some msg');
log('some msg');
```
