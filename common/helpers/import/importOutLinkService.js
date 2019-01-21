const loopback = require('loopback');

/**
 * Подкачивает данные в таблицу Out_link_service из других таблиц
 * @param {*} input 
 */
let importOutLinkService = function() {

    let OutLinkService = loopback.findModel('Out_link_service');
    new Promise((resolve,reject) => {
        let Balance = loopback.findModel('Balance_resourse');
        Balance.find({},function(req,res) {
            let length = res.length;
            for(let index = 0; index < length; index++) {
                OutLinkService.find({'where':{'service_id':res[index].service_id,'enterprise_id':res[index].resource_enterprise_id}},function(req,result) {
                    if( result.length === 0 ) {
                        OutLinkService.create({'service_id':res[index].service_id,'enterprise_id':res[index].resource_enterprise_id});
                    }
                })
            }
        })
    }).then( () => {
        let Charge = loopback.findModel('Charge_resourse');
        Charge.find({},function(req,res) {
            let length = res.length;
            for(let index = 0; index < length; index++) {
                OutLinkService.find({'where':{'service_id':res[index].service_id,'enterprise_id':res[index].resource_enterprise_id}},function(req,result) {
                    if( result.length === 0 ) {
                        OutLinkService.create({'service_id':res[index].service_id,'enterprise_id':res[index].resource_enterprise_id});
                    }
                })
            }
        })
    })
}

module.exports = importOutLinkService;