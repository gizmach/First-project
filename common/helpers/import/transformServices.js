const {Transform} = require('stream');

/**
 * Преобразует строку в JSON
 */
class TransformServices extends Transform {

    constructor( options = {} ) {
        options.objectMode = true;
        options.decodeStrings = false;
        super(options);
    }

    /**
     * На входе строка, разбивает ее и конвертирует в JSON
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _transform( chunk, encoding, callback ) {
        let итог = {};
        let строка = chunk.split(';?');
        итог['full_name'] = строка[0] == undefined ? '' : строка[0].trim();
        итог['short_name'] = строка[1] == undefined ? '' : строка[1].trim();
        итог.units = строка[2] == undefined ? '' : строка[2].trim();
        итог.code = строка[3] == undefined ? '' : строка[3];
        callback(null,итог);
    }
}
module.exports = TransformServices;