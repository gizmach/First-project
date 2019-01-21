const {Duplex}  = require('stream');
const loopback = require('loopback');

/**
 * Поиск и создание адреса
 */
class addressSearch extends Duplex {

    /**
     * 
     * @param {*} string 
     * @param {*} options 
     */
    constructor( options = {} ) {
        options.objectMode = true;
        options.decodeStrings = false;
        super(options);
        this.cash = [];
    }

    /**
     * 
     */
    _read() {
    }

    /**
     * Поиск и создание адреса
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _write( chunk, encoding, callback ) {
        let dataAddress = Object.assign({},chunk);
        let Address = loopback.findModel('Address_Ref');
        new Promise((resolve,reject) => {
            Address.find({'where':{name:dataAddress.address_out_id}},{},function(req,res) {
                if( res.length > 0 ) {
                    dataAddress['address_id'] = res[0].id;
                    resolve(dataAddress);
                } else {
                    Address.create({name:dataAddress.address_out_id,district:2},{},function(req,res) {
                        if( res.id > 0 > 0 ) {
                            dataAddress['address_id'] = res.id;
                            resolve(dataAddress);
                        } else reject();
                    })
                }
            }) 
        }).then(response => {
            delete dataAddress.address_out_id;
            this.push(dataAddress); 
            callback();
        },error => {
            callback();
        }) 
    }
}
module.exports = addressSearch;