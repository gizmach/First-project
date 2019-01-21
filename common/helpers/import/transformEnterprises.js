const {Transform} = require('stream');

/**
 * Преобразует строку в JSON
 */
class TransformEnterprises extends Transform {

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
        итог.itn = строка[2] == undefined ? '' : строка[2].trim();
        итог.iec = строка[3] == undefined ? '' : строка[3].trim();
        итог['registered_office_address_id'] = строка[4] == undefined ? '' : строка[4].trim();
        итог['legal_address_address_id'] = строка[5] == undefined ? '' : строка[5].trim();
        итог.phones = строка[6] == undefined ? '' : строка[6].trim();
        итог.okpo = строка[7] == undefined ? '' : строка[7].trim();
        итог.mail = строка[8] == undefined ? '' : строка[8].trim();
        итог.website = строка[9] == undefined ? '' : строка[9].trim();
        итог.fax = строка[10] == undefined ? '' : строка[10].trim();
        итог['external_code'] = строка[11] == undefined ? '' : строка[11].trim();
        callback(null,итог);
    }
}
module.exports = TransformEnterprises;