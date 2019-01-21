const fs = require('fs');
const TransformBalanceAdjustment = require('./transformBalanceAdjustment');
const ClassWriteBalanceAdjustment = require('./writeBalanceAdjustment');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');

/**
 * Подкачивает данные в таблицу Balance_Adjustment из файла
 * @param {*} input 
 */
let importBalanceAdjustment= function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWriteBalanceAdjustment();
    let streamLines = new ClassDuplex(3);
    let streamTransform = new TransformBalanceAdjustment();
    let streamSearchService = new ServiceSearch();
    let streamSearchEnterprise = new EnterpriseSearch();
    streamRead
    .pipe(streamLines)
    .pipe(streamTransform)
    .pipe(streamSearchService)
    .pipe(streamSearchEnterprise)
    .pipe(streamWrite);
}

module.exports = importBalanceAdjustment;
