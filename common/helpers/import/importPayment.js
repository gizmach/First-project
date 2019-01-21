const fs = require('fs');
const TransformPayment = require('./transformPayment');
const ClassWritePayment = require('./writePayment');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');
const AddressSearch = require('./searchAddress');

/**
 * Подкачивает данные в таблицу Payment из файла
 * @param {*} input 
 */
let importPayment = function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWritePayment();
    let streamLines = new ClassDuplex(4);
    let streamTransform = new TransformPayment();
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

module.exports = importPayment;
