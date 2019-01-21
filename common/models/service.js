'use strict';
const importServices = require("../helpers/import/importServices");

module.exports = function(service) {

    /**
     * описание метода
     */
    service.insertData = function(url,call) {
        importServices(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    service.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Service_ref')
        }
    )

};