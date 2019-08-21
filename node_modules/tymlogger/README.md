# tymlogger
A simple logger

## Install
```
npm install tymlogger --save
```

## Example
```js

const Logger = require('tymlogger');
const log = new Logger();

log.write("Hello"); //  [16:20:43:816]  Hello
log.success("You love beer!"); //  [16:20:43:822]  You love beer!
log.error("You not have beer :("); // [16:20:43:822]  You not have beer :(

```

![This show](/screenshot.png "This show")

## Methods

<b>Logger::write(String text)<b> - write simple log <br>
<b>Logger::success(String text)<b> - write success log <br>
<b>Logger::error(String text)<b> - write error log