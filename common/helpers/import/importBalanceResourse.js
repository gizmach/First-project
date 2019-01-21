const fs = require('fs');
const TransformBalanceResourse = require('./transformBalanceResourse');
const ClassWriteBalanceResourse = require('./writeBalanceResourse');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');
const AddressSearch = require('./searchAddress');

/**
 * Подкачивает данные в таблицу BalanceResourse из файла
 * @param {*} input 
 */
let importBalanceResourse = function(input) {

    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWriteBalanceResourse();
    let streamLines = new ClassDuplex(6);
    let streamTransform = new TransformBalanceResourse();
    let streamSearchService = new ServiceSearch();
    let streamSearchEnterprise = new EnterpriseSearch();
    let streamSearchAddress= new AddressSearch();
    streamRead
    .pipe(streamLines)
    .pipe(streamTransform)
    .pipe(streamSearchService)
    .pipe(streamSearchEnterprise)
    .pipe(streamSearchAddress)
    .pipe(streamWrite);
}

module.exports = importBalanceResourse;
