const {AddressName} = require('../helpers/accords/accordAddress');
const {RegionName} = require('../helpers/accords/accordAddress');

module.exports = function(address) {

    /**
     * Список районов
     * Мониторинг
     */
    address.addressList = function(region,call) {
        let output = [];
        let arrayAddress = AddressName[region];
        for( let key in arrayAddress ) {
            output.push({id:key,name:arrayAddress[key]});
        }
        call(null,output);
    }
    
    /**
     * параметры вызова метода
     */
    address.remoteMethod(
        'addressList', {
            accepts: {arg: 'region', type: 'number',"required": true},
            returns: {arg: 'addressList', type: 'string'},
            description: ('Список адресов')
        }
    )

    /**
     * Список регионов
     * Мониторинг
     */
    address.regionList = function(call) {
        let output = [];
        for( let key in RegionName ) {
            output.push({value:key,text:RegionName[key]});
        }
        call(null,output);
    }
    
    /**
     * параметры вызова метода
     */
    address.remoteMethod(
        'regionList', {
            returns: {arg: 'regionList', type: 'string'},
            description: ('Список регионов')
        }
    )

};