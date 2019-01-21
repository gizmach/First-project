const {Writable}  = require('stream');
const loopback = require('loopback');

/**
 * Читает данные и записывает в базу
 */
class ClassWriteCharge extends Writable {
     
    /**
     * 
     * @param {*} options 
     */
    constructor( wr,options = {} ) {
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
        
        let dataCharge = Object.assign({},chunk);
        let Charge = loopback.findModel('Charge');
        Charge.create(dataCharge,{},function(req,res) {
            if( req !== null ) {
                let err = new Error(req.message);
                callback(err);
            }
            callback(null);
        });
    }
}
module.exports = ClassWriteCharge;