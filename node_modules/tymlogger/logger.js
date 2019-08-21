
const colors = require("colors");
const timestamp = require("time-stamp");

class Logger {

    write (text) {

        let time = "[" + timestamp("HH:mm:ss:ms") + "]";

        console.log(" " + colors.gray(time) + "  " + colors.white(text));

    }

    success (text) {

        let time = "[" + timestamp("HH:mm:ss:ms") + "]";
        
        console.log(" " + colors.gray(time) + "  " + colors.green(text))

    }

    error (text) {

        let time = "[" + timestamp("HH:mm:ss:ms") + "]";
        
        console.log(" " + colors.gray(time) + "  " + colors.red(text))

    }

}

module.exports = Logger
