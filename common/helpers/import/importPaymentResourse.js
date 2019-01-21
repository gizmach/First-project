const fs = require('fs');
const TransformPaymentResourse = require('./transformPaymentResourse');
const ClassWritePaymentResourse = require('./writePaymentResourse');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');
const AddressSearch = require('./searchAddress');

/**
 * Подкачивает данные в таблицу PaymentResourse из файла
 * @param {*} input 
 */
let importPaymentResourse = function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWritePaymentResourse();
    let streamLines = new ClassDuplex(6);
    let streamTransform = new TransformPaymentResourse();
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

module.exports = importPaymentResourse;
