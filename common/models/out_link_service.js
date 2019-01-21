'use strict';
const ImportOutLinkService = require("../helpers/import/importOutLinkService");

module.exports = function(outService) {

    /**
     * Подкачка в таблицу Out_link_service
     */
    outService.insertData = function(call) {
        ImportOutLinkService();
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    outService.remoteMethod(
        'insertData', {
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка в таблицу Out_link_service')
        }
    )
  
};