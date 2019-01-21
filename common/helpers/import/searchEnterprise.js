const {Duplex}  = require('stream');
const loopback = require('loopback');

/**
 * Поиск организаций
 */
class enterpiseSearch extends Duplex {

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
     * Поиск организаций
     * @param {*} chunk 
     * @param {*} encoding 
     * @param {*} callback 
     */
    _write( chunk, encoding, callback ) {
        let dataEnterprise = Object.assign({},chunk);
        let EnterpriseOut = loopback.findModel('Out_link_enterprises');
        new Promise((resolve,reject) => {
            EnterpriseOut.find({'where':{'external_code':dataEnterprise.management_enterprise_out_id}},{},function(req,res) {
                if( res.length > 0 ) {
                    dataEnterprise['management_enterprise_id'] = res[0].ref_enterprise_id;
                    resolve(dataEnterprise);
                } else {
                    dataEnterprise['management_enterprise_id']= -1;
                    resolve(dataEnterprise);
                }
            })
        }).then( response => {
            delete dataEnterprise.management_enterprise_out_id;
            if( dataEnterprise.resource_enterprise_id !== undefined ) {
                this.push(dataEnterprise); 
                callback();
            }
        },error => {
            if( dataEnterprise.resource_enterprise_id !== undefined )
                callback();
        }) 
        new Promise((resolve,reject) => {
            EnterpriseOut.find({'where':{'external_code':dataEnterprise.resource_enterprise_out_id}},{},function(req,res) {
                if( res.length > 0 ) {
                    dataEnterprise['resource_enterprise_id'] = res[0].ref_enterprise_id;
                    resolve(dataEnterprise);
                } else {
                    dataEnterprise['resource_enterprise_id']  = -1;
                    resolve(dataEnterprise);
                }
            })
        }).then( response => {
            delete dataEnterprise.resource_enterprise_out_id;
            if( dataEnterprise.management_enterprise_id !== undefined ) {
                this.push(dataEnterprise); 
                callback();
            }
        },error => {
            if( dataEnterprise.management_enterprise_id !== undefined ) 
                callback();
        }) 
    }
}
module.exports = enterpiseSearch;