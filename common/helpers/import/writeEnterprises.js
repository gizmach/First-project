const {Writable}  = require('stream');
const loopback = require('loopback');

/**
 * Читает данные и записывает в базу
 */
class ClassWriteEnterprises extends Writable {
     
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
     
        let dataEnterprise = Object.assign({},chunk);
        let dataOutLink = {};
        dataOutLink['external_code'] = dataEnterprise['external_code'];
        delete dataEnterprise.external_code;
        let Enterprise = loopback.findModel('Enterprise_Ref');
        Enterprise.find({'where':{'full_name':dataEnterprise.full_name}},{},function(req,res) {
            if( res.length === 0 ) {
                Enterprise.create(dataEnterprise,{},function(req,res)  {
                    if( req !== null ) {
                        let err = new Error(req.message);
                        callback(err);
                    }
                    dataOutLink['ref_enterprise_id'] = res.id;
                    let OutLinkEnterprise = loopback.findModel('Out_link_enterprises');
                    OutLinkEnterprise.create(dataOutLink,{},function(req,res) {
                        if( req !== null ) {
                            let err = new Error(req.message);
                            callback(err);
                        }
                        callback(null);
                    });
                })
            } else {
                callback(null);
            }
        })
    }
}
module.exports = ClassWriteEnterprises;