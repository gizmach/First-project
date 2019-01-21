const {Transform} = require('stream');
const moment = require('moment');

/**
 * Преобразует строку в JSON
 */
class TransformChargeResourse extends Transform {

    constructor( options = {} ) {
        options.objectMode = true;
        options.decodeStrings = false;
        super(options);
        this.period = "";
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
        if( строка.length === 2 ) {
            let arrayDate = строка[0].split('-');
            this.period = moment([arrayDate[0],+arrayDate[1]-1,arrayDate[2]]).format('YYYY-MM-DD');
            callback(null);
        } else {
            итог['service_code'] = строка[0] == undefined ? '' : строка[0].trim();
            итог['management_enterprise_out_id'] = строка[1] == undefined ? '' : строка[1].trim();
            итог['resource_enterprise_out_id'] = строка[2] == undefined ? '' : строка[2].trim();
            итог['address_out_id'] = строка[3] == undefined ? '' : строка[3].trim();
            итог.amount = строка[4] == undefined ? '' : строка[4].trim();
            итог.sum = строка[5] == undefined ? '' : строка[5].trim();
            итог['number_document'] = строка[6] == undefined ? '' : строка[6].trim();
            итог['date_document'] = строка[7] == undefined ? '' : строка[7].trim();
            итог.period = this.period;
            callback(null,итог);
        }
    }
}
module.exports = TransformChargeResourse;