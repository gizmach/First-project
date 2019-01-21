const {Writable}  = require('stream');
const loopback = require('loopback');

/**
 * Читает данные и записывает в базу
 */
class ClassWriteBalanceAdjustment extends Writable {
     
    /**
     * 
     * @param {*} options 
     */
    constructor( options = {} ) {
        options.objectMode = true;
        options.decodeStrings = false;
        super(options);
    }

    /**
     * Перебирает массив и отправляет в базу
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _write(chunk, encoding, callback) {
        
        let dataBalanceAdjustment = Object.assign({},chunk);
        let BalanceAdjustment = loopback.findModel('Balance_adjustment');
        BalanceAdjustment.create(dataBalanceAdjustment,{},function(req,res) {
            if( req !== null ) {
                let err = new Error(req.message);
                callback(err);
            }
            callback(null);
        });
    }
}
module.exports = ClassWriteBalanceAdjustment;