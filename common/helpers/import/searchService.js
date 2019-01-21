const {Duplex}  = require('stream');
const loopback = require('loopback');

/**
 * Поиск услуг
 */
class serviceSearch extends Duplex {

     /**
      * 
      * @param {*} string 
      * @param {*} options 
      */
    constructor( options = {} ) {
        options.objectMode = true;
        options.decodeStrings = false;
        super(options);
        this.cash = {};
    }

    /**
     * 
     */
    _read() {
    }

    /**
     * Поиск услуг
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _write( chunk, encoding, callback ) {
        let dataService = Object.assign({},chunk);
        let Service = loopback.findModel('Service_Ref');
        new Promise((resolve,reject) => {
            Service.find({'where':{code:dataService.service_code}},{},function(req,res) {
                if( res.length > 0 ) {
                    dataService['service_id'] = res[0].id;
                    resolve(dataService);
                } else {
                    dataService['service_id']  = -1;
                    resolve(dataService);
                }
            })
        }).then(response => {
            delete dataService.service_code;
            this.push(dataService); 
            callback();
        },error => {
            callback();
        }) 
      //  }
    }
}
module.exports = serviceSearch;