'use strict';
const importChargeResourse = require("../helpers/import/importChargeResourse");
const moment = require('moment');
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const modelConfig = require('../../server/datasources.json').stackPostgreDb;
const accordServicesArray = require('../helpers/accords/accordServicesArray');

module.exports = function(chargeResourse) {
 
    /**
     * описание метода
     */
    chargeResourse.insertData = function(url,call) {
        importChargeResourse(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    chargeResourse.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Charge_resourse')
        }
    )
    /**
     * Генерация новых данных
     * @param {*} call 
     */
    chargeResourse.GenerateData = function(call) {

        let monthStart = moment([2016, 0,1]).format('YYYY-MM-DD');
        let monthEnd = moment([2016, 11,1]).format('YYYY-MM-DD');
        chargeResourse.find({
            'where':{
                period:{between:[monthStart,monthEnd]}
            }
        }
        ,function(err, result) {
            if( err !== null ) {
                call(err.message,{});
                return '';
            }
            let length = result.length;
            let dataBalance = {};
            let indData = 0;
            for(let index = 0; index < length; index++) {
                let periodMonth = +result[index].period.getMonth();
                for(let ind = 2015; ind < 2018; ind++) {
                    if( ind !== 2016 ) {
                        let currentMonth = moment([ind, periodMonth,1]).format('YYYY-MM-DD');
                        dataBalance[indData] = JSON.parse(JSON.stringify(result[index]));
                        dataBalance[indData].period = currentMonth;
                        let coef =  (4.5 + Math.random() * 6)/100;
                        if( index%2 === 0 ) {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount - +result[index].amount*coef).toFixed(5);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount + +result[index].amount*coef).toFixed(5);
                            }
                        } else {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount + +result[index].amount*coef).toFixed(5);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount - +result[index].amount*coef).toFixed(5);
                            }
                        }
                        delete(dataBalance[indData].id);
                        indData++;
                    }
                }
            }
            let data = [];
            for(let key in dataBalance) {
                data.push(dataBalance[key]);
            }
            chargeResourse.create(data,{},function(req,res) {
                if( req !== null ) {
                    let err = new Error(req[0].message);
                    call(err);
                    return '';
                }
                call(null,'Сделано');
            });
        })

    }
    
    /**
     * параметры вызова метода
     */
    chargeResourse.remoteMethod(
        'GenerateData', {
            returns: {arg: 'GenerateData', type: 'string'},
            description: ('Генерация данных')
        }
    )        

};