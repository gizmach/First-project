const loopback = require('loopback');
const ServicesCodes = require('./accordProperties').ServicesCodes;

/**
 * Возвращает промис с массивом услуг
 * @param {*} input 
 */
let accordServicesArray = function(input) {

    return  new Promise((resolve,reject) => {
        if( input === undefined ) {
            reject('Не передан массив услуг');
        }
        let arrayService = [];
        let tempValue = [];
        let lengthInput = input.length;
        for(let index = 0; index < lengthInput; index++) {
            tempValue = ServicesCodes[input[index]];
            if( tempValue === undefined ) {
                reject('Услуга не найдена');
            } else {
                arrayService = arrayService.concat(tempValue);
            }
        }
        let Service = loopback.findModel('Service_Ref');
        let output = [];
        Service.find({},
        function(err, result) {
            let lengthResult = result.length;
            if( lengthResult === 0 ) {
                reject('Справочник услуг пустой');
            }
            let lengthService = arrayService.length;
            for(let i = 0; i < lengthResult; i++) {
                let delta = result[i].code - result[i].code%100;
                for(let ind = 0; ind < lengthService; ind++) {
                    if( delta === arrayService[ind] ) {
                        output.push(+result[i].id);
                    }
                }
            }
            resolve(output);
        })
    })
}

module.exports = accordServicesArray;
