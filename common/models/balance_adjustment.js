'use strict';
const importBalanceAdjustment = require("../helpers/import/importBalanceAdjustment");

module.exports = function(adjustment) {

    /**
     * описание метода
     */
    adjustment.insertData = function(url,call) {
        importBalanceAdjustment(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    adjustment.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Balance_Adjustment')
        }
    )
};