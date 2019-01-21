const fs = require('fs');
const TransformServices = require('./transformServices');
const ClassWriteServices = require('./writeServices');
const ClassDuplex = require('./streamDuplex');

/**
 * Подкачивает данные в таблицу Service_ref из файла
 * @param {*} input 
 */
let importServices = function(input) {
    
    let streamRead = fs.createReadStream(input, {encoding: 'utf-8'});
    let streamWrite = new ClassWriteServices();
    let streamLines = new ClassDuplex(3);
    let streamTransform = new TransformServices();
    streamRead.pipe(streamLines).pipe(streamTransform).pipe(streamWrite);
}

module.exports = importServices;
