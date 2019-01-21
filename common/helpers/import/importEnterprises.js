const fs = require('fs');
const TransformEnterprises = require('./transformEnterprises');
const ClassWriteEnterprisese = require('./writeEnterprises');
const ClassDuplex = require('./streamDuplex');

/**
 * Подкачивает данные в таблицу Enterprise_ref из файла
 * @param {*} input 
 */
let importEnterprises = function(input) {

    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});//,highWaterMark:100
    let streamWrite = new ClassWriteEnterprisese();
    let streamLines = new ClassDuplex(11);
    let streamTransform = new TransformEnterprises();
    streamRead.pipe(streamLines).pipe(streamTransform).pipe(streamWrite);
}

module.exports = importEnterprises;
