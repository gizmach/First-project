const fs = require('fs');
const TransformSocialBenefits = require('./transformSocialBenefits');
const ClassWriteSocialBenefits = require('./writeSocialBenefits');
const ClassDuplex = require('./streamDuplex');
const ServiceSearch = require('./searchService');
const EnterpriseSearch = require('./searchEnterprise');

/**
 * Подкачивает данные в таблицу Payment из файла
 * @param {*} input 
 */
let importSocialBenefits = function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWriteSocialBenefits();
    let streamLines = new ClassDuplex(6);
    let streamTransform = new TransformSocialBenefits();
    let streamSearchService = new ServiceSearch();
    let streamSearchEnterprise = new EnterpriseSearch();
    streamRead
    .pipe(streamLines)
    .pipe(streamTransform)
    .pipe(streamSearchService)
    .pipe(streamSearchEnterprise)
    .pipe(streamWrite);
}

module.exports = importSocialBenefits;
