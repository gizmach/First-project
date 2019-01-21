const {Duplex}  = require('stream');

/**
 * Читает данные и передает в буфер массив построчно
 */
class ClassDuplex extends Duplex {

     /**
      * 
      * @param {*} string 
      * @param {*} options 
      */
    constructor( fields, options = {} ) {
        options.encoding = 'UTF8';
        super(options);
        this.stringBuffer = "";
        this.fields = fields;
    }

    /**
     * 
     */
    _read() {
    }

    /**
     * Принимает буфер файла и передает построчно
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _write( chunk, encoding, callback ) {
        let chunkString = this.stringBuffer + chunk.toString();
        let pozition = chunkString.lastIndexOf('\r\n');
        this.stringBuffer = chunkString.slice(pozition+2);
        let dataString = chunkString.slice(0,pozition);
        let data = dataString.split('\r\n');
        data.reverse();
        let dataLine = [];
        while( data.length !== 0 ) {
            dataLine = data.pop();
            let position = -1;
            let index = 0;
            while ((position = dataLine.indexOf(';?', position + 1)) != -1) {
                index++;
            }
            if( index === this.fields ) {
                if( data.length === 0 ) {
                    this.push(dataLine); 
                    callback();
                } else {
                    this.push(dataLine||null); 
                }
            } else {
                if( index === 1 && data.length > 0 ) {
                    this.push(dataLine||null); 
                } else {
                    callback();
                }
            }
        }
    }
}
module.exports = ClassDuplex;