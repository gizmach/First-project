'use strict';
const importSocialBenefits = require("../helpers/import/importSocialBenefits");

module.exports = function(social) {

    /**
     * описание метода
     */
    social.insertData = function(url,call) {
        importSocialBenefits(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    social.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Social_Benefits')
        }
    )
};