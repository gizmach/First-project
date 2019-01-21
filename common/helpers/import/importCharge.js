const fs = require('fs');
const TransformCharge = require('./transformCharge');
const ClassWriteCharge = require('./writeCharge');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');
const AddressSearch = require('./searchAddress');

/**
 * Подкачивает данные в таблицу Service_ref из файла
 * @param {*} input 
 */
let importCharge = function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});//,highWaterMark:100
    let streamWrite = new ClassWriteCharge();
    let streamLines = new ClassDuplex(7);
    let streamTransform = new TransformCharge();
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

module.exports = importCharge;
