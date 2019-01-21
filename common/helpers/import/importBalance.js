const fs = require('fs');
const TransformBalance = require('./transformBalance');
const ClassWriteBalance = require('./writeBalance');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');
const AddressSearch = require('./searchAddress');

/**
 * Подкачивает данные в таблицу Balance из файла
 * @param {*} input 
 */
let importBalance= function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});//,highWaterMark:100
    let streamWrite = new ClassWriteBalance();
    let streamLines = new ClassDuplex(4);
    let streamTransform = new TransformBalance();
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

module.exports = importBalance;
