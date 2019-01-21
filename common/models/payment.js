'use strict';
const importPayment = require("../helpers/import/importPayment");
const loopback = require('loopback');
const accordServicesArray = require('../helpers/accords/accordServicesArray');
const moment = require('moment');
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const modelConfig = require('../../server/datasources.json').stackPostgreDb;

module.exports = function(payment) {

    /**
     * описание метода
     */
    payment.insertData = function(url,call) {
        importPayment(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    payment.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Payment')
        }
    )

    /**
     * Метод возвращает оплаты по организации-кредитору
     * и организациям-дебиторам в разрезе кварталов за год
     * Четвертая страница
     */
    payment.paymentCredit = function(year,idCredit,service,region,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
        let deltaMonth = 12;
        new Promise((resolve,reject) => {
            let arrService = service.split(',');
            accordServicesArray(arrService)
            .then(res => { 
                if( res.length > 0) {
                    resolve(res);
                } else {
                    reject('Таких услуг не существует');
                }
            })
        }).then( res => {
            let output = {};
            for(let i = 0; i<deltaMonth; i++) {
                output[i] = {sumDebet:0,sumCredit:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,period,1 AS type '+
                                        'FROM stack.payment_resourse t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) AND region = $5 '+
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(sum) AS sum,period,2 AS type '+
                                        'FROM stack.payment t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $6 and period <= $7 and resource_enterprise_id = $8 and service_id = ANY ($9) AND region = $10 '+
                                        'GROUP BY period'
                                        ,[monthStart,monthEnd,idCredit,res,region,monthStart,monthEnd,idCredit,res,region],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                if( data.type === 1 ) {
                    output[data.period.getMonth()].sumCredit += +data.sum;
                } else {
                    output[data.period.getMonth()].sumDebet += +data.sum;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                let indx = 0;
                let sumCredit = 0;
                let sumDebet = 0;
                let delta = 0;
                for(let ind in output) {
                    delta += +output[ind].sumCredit.toFixed(2) - +output[ind].sumDebet.toFixed(2);
                    sumCredit += +output[ind].sumCredit.toFixed(2);
                    sumDebet += +output[ind].sumDebet.toFixed(2);
                    indx++;
                    if( indx === 3 ) {
                        total.push({'delta':delta.toFixed(2),'sumCredit':sumCredit.toFixed(2),'sumDebet':sumDebet.toFixed(2)});
                        delta = 0;
                        sumCredit = 0;
                        sumDebet = 0;
                        indx = 0;
                    }
                }
                call(null,total);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        },rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    payment.remoteMethod(
        'paymentCredit', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'id', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'paymentCredit', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )

    /**
     * Метод возвращает оплаты по организации-дебитору
     * и организации-кредитору в разрезе кварталов за год
     * Пятая страница
     */
    payment.paymentDebet = function(year,service,idCredit,idDebet,region,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
        let deltaMonth = 12;
        new Promise((resolve,reject) => {
            let serviceArray = service.split(',');
            accordServicesArray(serviceArray)
            .then(res => { 
                if( res.length > 0) {
                    resolve(res);
                } else {
                    reject('Таких услуг не существует');
                }
            })
        }).then( res => {
            let output = [];
            for(let i = 0; i<deltaMonth; i++) {
                output[i] = {sumCredit:0,sumDebet:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,period,1 AS type '+
                                        'FROM stack.payment_resourse t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and management_enterprise_id = $4 and service_id = ANY ($5) AND region = $6 '+
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(sum) AS sum,period,2 AS type '+
                                        'FROM stack.payment t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $7 and period <= $8 and resource_enterprise_id = $9 and management_enterprise_id = $10 and service_id = ANY ($11) AND region = $12 '+
                                        'GROUP BY period'
                                        ,[monthStart,monthEnd,idCredit,idDebet,res,region,monthStart,monthEnd,idCredit,idDebet,res,region],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                if( data.type === 1 ) {
                    output[data.period.getMonth()].sumCredit += +data.sum;
                } else {
                    output[data.period.getMonth()].sumDebet += +data.sum;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                let delta = 0;
                let sumCredit = 0;
                let sumDebet = 0;
                let indx = 0;
                for(let ind in output) {
                    delta += +output[ind].sumCredit.toFixed(2) - +output[ind].sumDebet.toFixed(2);
                    sumCredit += +output[ind].sumCredit.toFixed(2);
                    sumDebet += +output[ind].sumDebet.toFixed(2);
                    indx++;
                    if( indx === 3 ) {
                        total.push({'delta':delta.toFixed(2),'sumCredit':sumCredit.toFixed(2),'sumDebet':sumDebet.toFixed(5)});
                        delta = 0;
                        sumCredit = 0;
                        sumDebet = 0;
                        indx = 0;
                    }
                }
                call(null,total);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        },rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    payment.remoteMethod(
        'paymentDebet', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": false},
                {arg: 'idCredit', type: 'number',"required": true},
                {arg: 'idDebet', type: 'number',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'paymentDebet', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )
    
    /**
     * Генерация новых данных
     * @param {*} call 
     */
    payment.GenerateData = function(call) {

        let monthStart = moment([2016, 0,1]).format('YYYY-MM-DD');
        let monthEnd = moment([2016, 11,1]).format('YYYY-MM-DD');
        payment.find({
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
            let coef = 0;
            for(let index = 0; index < length; index++) {
                let periodMonth = +result[index].period.getMonth();
                for(let ind = 2013; ind < 2018; ind++) {
                    if( ind !== 2016 ) {
                        let currentMonth = moment([ind, periodMonth,1]).format('YYYY-MM-DD');
                        dataBalance[indData] = JSON.parse(JSON.stringify(result[index]));
                        dataBalance[indData].period = currentMonth;
                        coef =  (4.5 + Math.random() * 6)/100;
                        if( index%2 === 0 ) {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                            }
                        } else {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
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
            payment.create(data,{},function(req,res) {
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
    payment.remoteMethod(
        'GenerateData', {
            returns: {arg: 'GenerateData', type: 'string'},
            description: ('Генерация данных')
        }
    )

    /**
     * Нарастающие итоги по оплатам
     * @param {*} month 
     * @param {*} service 
     * @param {*} call 
     */
    payment.RunningTotalsPayment = function(month,service,region,enterprise,call) {

        let arrayMonth = month.split('-');
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1]-1,1,23]).format();
        new Promise((resolve,reject) => {
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
            .then(res => { 
                if( res.length > 0) {
                    resolve(res);
                } else {
                    reject('Таких услуг не существует');
                }
            })
        }).then( res => {
            let resPayment = {};
            let indMonth = arrayMonth[1];
            let currentYear = +arrayMonth[0];
            for(let i = 0; i<+indMonth+1; i++) {
                resPayment[i] = 0;
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let arrayPromise = [];
            let ind = 0;
            let where = ' and 0 =';
            let indEnt = 0;
            if( enterprise !== undefined ) {
                where = ' and management_enterprise_id = ';
                indEnt = enterprise;
            }
            for( let index = 2000; index < currentYear + 1; index++ ) {
                let monthStart = moment([index, 0,1]).format();
                let monthMiddle = monthEnd;
                if( index < currentYear ) {
                    monthMiddle = moment([index, 11,1,23]).format();
                }
                arrayPromise[ind] = new Promise((resolve,reject) => {
                    let query = new QueryStream('SELECT sum(sum) AS sum,period,1 AS type '+
                                                'FROM stack.payment t '+
                                                'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                                'WHERE period >= $1 AND period <= $2 AND service_id = ANY ($3) and a.region = $4 '+
                                                where + '$5 ' +
                                                'GROUP BY period '+
                                                'UNION ALL '+
                                                'SELECT sum(sum) AS sum,period,2 AS type '+
                                                'FROM stack.payment_resourse t '+
                                                'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                                'WHERE period >= $6 AND period <= $7 AND service_id = ANY ($8) and a.region = $9 '+ 
                                                where + '$10 ' +
                                                'GROUP BY period '
                                                ,[monthStart,monthMiddle,res,region,indEnt,monthStart,monthMiddle,res,region,indEnt],{batchSize:100});
                    let streamQuery = client.query(query);
                    streamQuery.on('data',(data) => {
                        let year = +data.period.getFullYear();
                        if( year < currentYear ) {
                            if( data.type === 1 ) {
                                resPayment[0] -= +data.sum;
                            } else {
                                resPayment[0] += +data.sum;
                            }
                        } else {
                            let numberMonth = +data.period.getMonth();
                            if( data.type === 1 ) {
                                resPayment[numberMonth+1] -= +data.sum;
                            } else {
                                resPayment[numberMonth+1] += +data.sum;
                            }
                        }
                    })
                    streamQuery.on('end', () => {
                        resolve(resPayment);
                    })
                    streamQuery.on('error', (error) => {
                        reject(error)
                        return '';
                    })
                })
                ind++;
            }
            Promise.all(arrayPromise).then( () => {
                client.end();
                let output = [];
                let max = 0;
                let min = 0;
                for(let key in resPayment) {
                    if( +key !== 0 ) {
                        resPayment[key] = +resPayment[+key-1] + +resPayment[key];
                    }
                    resPayment[key] = resPayment[key].toFixed(2);
                    output.push({sum:resPayment[key]});
                    max = Math.max(max,+resPayment[key]);
                    min = Math.min(min,+resPayment[key]);
                }
                output.unshift({max:max.toFixed(2),min:min.toFixed(2)});
                call(null,output);
                
            },rej => {
                client.end();
                call(rej);
            })
        },rej => {
            call(rej);
        })
    }
    
    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    payment.remoteMethod(
        'RunningTotalsPayment', {
            accepts: [
                {arg: 'month', type: 'string',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'RunningTotalsPayment', type: 'string'},
            description: ('Нарастающие итоги по оплатам')
        }
    )      
    
};