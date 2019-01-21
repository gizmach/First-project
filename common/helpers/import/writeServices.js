const {Writable}  = require('stream');
const loopback = require('loopback');

/**
 * Читает данные и записывает в базу
 */
class ClassWriteServices extends Writable {
     
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
        
        let dataService = Object.assign({},chunk);
        let Service = loopback.findModel('Service_Ref');
        Service.find({'where':{code:dataService.code}},{},function(req,res) {
            if( res.length === 0 ) {
                Service.create(dataService,{},function(req,res) {
                    if( req !== null ) {
                        let err = new Error(req.message);
                        callback(err);
                    }
                    callback(null);
                });
            } else {
                callback(null);
            }
        })
    }
}
module.exports = ClassWriteServices;