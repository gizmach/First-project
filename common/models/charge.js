'use strict';
const importCharge = require("../helpers/import/importCharge");
const accordServicesArray = require('../helpers/accords/accordServicesArray');
const moment = require('moment');
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const modelConfig = require('../../server/datasources.json').stackPostgreDb;
const ServicesProperties = require('../helpers/accords/accordProperties');
const ServicesUnit = ServicesProperties.ServicesUnit;
const {setTimeout}  =  require("timers");

module.exports = function(charge) {
 
    /**
     * описание метода
     */
    charge.insertData = function(url,call) {
        importCharge(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    charge.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Charge')
        }
    )

    /**
     * Генерация новых данных
     * @param {*} call 
     */
    charge.GenerateData = function(call) {

        let monthStart = moment([2016, 0,1]).format('YYYY-MM-DD');
        let monthEnd = moment([2016, 11,1]).format('YYYY-MM-DD');
        charge.find({
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
                for(let ind = 2017; ind < 2018; ind++) {
                    if( ind !== 2016 ) {
                        let currentMonth = moment([ind, periodMonth,1]).format('YYYY-MM-DD');
                        dataBalance[indData] = JSON.parse(JSON.stringify(result[index]));
                        dataBalance[indData].period = currentMonth;
                        let coef =  (4.5 + Math.random() * 6)/100;
                        if( index%2 === 0 ) {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].recalculate = (+result[index].recalculate - +result[index].recalculate*coef).toFixed(2);
                                dataBalance[indData].quality = (+result[index].quality - +result[index].quality*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount - +result[index].amount*coef).toFixed(5);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].recalculate = (+result[index].recalculate + +result[index].recalculate*coef).toFixed(2);
                                dataBalance[indData].quality = (+result[index].quality + +result[index].quality*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount + +result[index].amount*coef).toFixed(5);
                            }
                        } else {
                            if( ind%2 !== 0 ) {
                                dataBalance[indData].sum = (+result[index].sum + +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].recalculate = (+result[index].recalculate + +result[index].recalculate*coef).toFixed(2);
                                dataBalance[indData].quality = (+result[index].quality + +result[index].quality*coef).toFixed(2);
                                dataBalance[indData].amount = (+result[index].amount + +result[index].amount*coef).toFixed(5);
                            } else {
                                dataBalance[indData].sum = (+result[index].sum - +result[index].sum*coef).toFixed(2);
                                dataBalance[indData].recalculate = (+result[index].recalculate - +result[index].recalculate*coef).toFixed(2);
                                dataBalance[indData].quality = (+result[index].quality - +result[index].quality*coef).toFixed(2);
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
            charge.create(data,{},function(req,res) {
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
    charge.remoteMethod(
        'GenerateData', {
            returns: {arg: 'GenerateData', type: 'string'},
            description: ('Генерация данных')
        }
    )    
    
    /**
     * Метод возвращает объемы по организации-кредитору
     * и организациям-дебиторам в разрезе кварталов за год
     * Четвертая страница
     */
    charge.chargeAmountCredit = function(year,idCredit,service,region,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
        let deltaMonth = 12;
        let unit = ServicesUnit.service;
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
                output[i] = {amountDebet:0,amountCredit:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(amount) AS amount,period,1 AS type '+
                                        'FROM stack.charge_resourse t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) AND region = $5 '+
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(amount) AS amount,period,2 AS type '+
                                        'FROM stack.charge t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $6 and period <= $7 and resource_enterprise_id = $8 and service_id = ANY ($9) AND region = $10 '+
                                        'GROUP BY period'
                                        ,[monthStart,monthEnd,idCredit,res,region,monthStart,monthEnd,idCredit,res,region],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                if( data.type === 1 ) {
                    output[data.period.getMonth()].amountCredit += +data.amount;
                } else {
                    output[data.period.getMonth()].amountDebet += +data.amount;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                let indx = 0;
                let delta = 0;
                let amountCredit = 0;
                let amountDebet = 0;
                for(let key in output) {
                    delta += Number((+output[key].amountCredit.toFixed(5) - +output[key].amountDebet.toFixed(5)).toFixed(5));
                    amountCredit += +output[key].amountCredit.toFixed(5);
                    amountDebet += +output[key].amountDebet.toFixed(5);
                    indx++;
                    if( indx === 3 ) {
                        delta = +delta.toFixed(5);
                        amountCredit = +amountCredit.toFixed(5);
                        amountDebet = +amountDebet.toFixed(5);
                        total.push({'delta':delta,'amountCredit':amountCredit,'amountDebet':amountDebet,units:unit});
                        delta = 0;
                        amountCredit = 0;
                        amountDebet = 0;
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
    charge.remoteMethod(
        'chargeAmountCredit', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'id', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'chargeAmountCredit', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )
    
    /**
     * Метод возвращает сумму начисления и оплаты по организации-дебитору
     * в разрезе кварталов за период
     * Пятая страница
     */
    charge.chargePay = function(yearStart,yearEnd,id,region,call) {

        let monthStart = moment([yearStart, 0,1]).format();
        let monthEnd = moment([yearEnd, 11,1,23]).format();
        let deltaMonth = (+yearEnd - +yearStart+1)*12;
        let output = [];
        for(let i = 0; i<deltaMonth; i++) {
            output[i] = {sumCharge:0,sumPay:0};
        }
        let client = new pg.Client(modelConfig);
        client.connect(function(error) {
            if( error !== null ) {
                call(error);
                return '';
            }
        });
        let query = new QueryStream('SELECT sum(sum) AS sum,period,1 AS type '+
                                    'FROM stack.payment t '+
                                    'JOIN stack.address_ref r on t.address_id = r.id ' +
                                    'WHERE period >= $1 and period <= $2 and management_enterprise_id = $3 AND region = $4  '+
                                    'GROUP BY period '+
                                    'UNION ALL '+
                                    'SELECT sum(sum)+sum(recalculate)-sum(quality) AS sum,period,2 AS type '+
                                    'FROM stack.charge t '+
                                    'JOIN stack.address_ref r on t.address_id = r.id ' +
                                    'WHERE period >= $5 and period <= $6 and management_enterprise_id = $7 AND region = $8  '+
                                    'GROUP BY period'
                                    ,[monthStart,monthEnd,id,region,monthStart,monthEnd,id,region],{batchSize:100});
        let streamQuery = client.query(query);
        streamQuery.on('data',(data) => {
            let indYear = (+data.period.getFullYear() - +yearStart)*12;
            let indMonth = +data.period.getMonth(); 
            if( data.type === 1 ) {
                output[indMonth + +indYear].sumPay += +data.sum;
            } else {
                output[indMonth + +indYear].sumCharge += +data.sum;
            }
        })
        streamQuery.on('end', () => {
            client.end();
            let total = [];
            let delta = 0;
            let sumCharge = 0;
            let sumPay = 0;
            let indx = 0;
            for(let ind in output) {
                delta += +output[ind].sumCharge.toFixed(2) - +output[ind].sumPay.toFixed(2);
                sumCharge += +output[ind].sumCharge.toFixed(2);
                sumPay += +output[ind].sumPay.toFixed(2);
                indx++;
                if( indx === 3 ) {
                    total.push({'delta':delta.toFixed(2),'sumCharge':sumCharge.toFixed(2),'sumPay':sumPay.toFixed(2)});
                    delta = 0;
                    sumCharge = 0;
                    sumPay = 0;
                    indx = 0;
                }
            }
            call(null,total);
        })
        streamQuery.on('error', (error) => {
            client.end();
            call(error);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    charge.remoteMethod(
        'chargePay', {
            accepts: [
                {arg: 'yearStart', type: 'number',"required": true},
                {arg: 'yearEnd', type: 'number',"required": true},
                {arg: 'id', type: 'number',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'chargePay', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )

    /**
     * Метод возвращает объемы по организации-дебитору
     * и организации-кредитору в разрезе кварталов за год
     * Пятая страница
     */
    charge.chargeAmountDebet = function(year,service,idCredit,idDebet,region,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
        let deltaMonth = 12;
        let unit = ServicesUnit.service;
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
                output[i] = {amountCredit:0,amountDebet:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(amount) AS amount,period,1 AS type '+
                                        'FROM stack.charge_resourse t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and management_enterprise_id = $4 and service_id = ANY ($5) AND region = $6 '+
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(amount) AS amount,period,2 AS type '+
                                        'FROM stack.charge t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $7 and period <= $8 and resource_enterprise_id = $9 and management_enterprise_id = $10 and service_id = ANY ($11) AND region = $12 '+
                                        'GROUP BY period'
                                        ,[monthStart,monthEnd,idCredit,idDebet,res,region,monthStart,monthEnd,idCredit,idDebet,res,region],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                if( data.type === 1 ) {
                    output[data.period.getMonth()].amountCredit += +data.amount;
                } else {
                    output[data.period.getMonth()].amountDebet += +data.amount;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                let delta = 0;
                let amountCredit = 0;
                let amountDebet = 0;
                let indx = 0;
                for(let ind in output) {
                    delta += +output[ind].amountCredit.toFixed(5) - +output[ind].amountDebet.toFixed(5);
                    amountCredit += +output[ind].amountCredit.toFixed(5);
                    amountDebet += +output[ind].amountDebet.toFixed(5);
                    indx++;
                    if( indx === 3 ) {
                        total.push({'delta':delta.toFixed(5),'amountCredit':amountCredit.toFixed(5),'amountDebet':amountDebet.toFixed(5),unit:unit});
                        delta = 0;
                        amountCredit = 0;
                        amountDebet = 0;
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
    charge.remoteMethod(
        'chargeAmountDebet', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'idCredit', type: 'number',"required": true},
                {arg: 'idDebet', type: 'number',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'chargeAmountDebet', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )

    /**
     * Нарастающие итоги по начислениям
     * @param {*} month 
     * @param {*} service 
     * @param {*} call 
     */
    charge.RunningTotalsCharge = function(month,service,region,enterprise,call) {

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
            let resCharge = {};
            let indMonth = arrayMonth[1];
            let currentYear = +arrayMonth[0];
            for(let i = 0; i<+indMonth+1; i++) {
                resCharge[i] = 0;
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
                    let query = new QueryStream('SELECT sum(sum)+sum(recalculate)-sum(quality) AS sum,period,1 AS type '+
                                                'FROM stack.charge t '+
                                                'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                                'WHERE period >= $1 AND period <= $2 AND service_id = ANY ($3) and a.region = $4 '+
                                                where + '$5 ' +
                                                'GROUP BY period '+
                                                'UNION ALL '+
                                                'SELECT sum(sum) AS sum,period,2 AS type '+
                                                'FROM stack.charge_resourse t '+
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
                                resCharge[0] -= +data.sum;
                            } else {
                                resCharge[0] += +data.sum;
                            }
                        } else {
                            let numberMonth = +data.period.getMonth();
                            if( data.type === 1 ) {
                                resCharge[numberMonth+1] -= +data.sum;
                            } else {
                                resCharge[numberMonth+1] += +data.sum;
                            }
                        }
                    })
                    streamQuery.on('end', () => {
                        resolve(resCharge);
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
                for(let key in resCharge) {
                    if( +key !== 0 ) {
                        resCharge[key] = +resCharge[+key-1] + +resCharge[key];
                    }
                    resCharge[key] = resCharge[key].toFixed(2);
                    output.push({sum:resCharge[key]});
                    max = Math.max(max,+resCharge[key]);
                    min = Math.min(min,+resCharge[key]);
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
    charge.remoteMethod(
        'RunningTotalsCharge', {
            accepts: [
                {arg: 'month', type: 'string',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'RunningTotalsCharge', type: 'string'},
            description: ('Нарастающие итоги по начислениям')
        }
    )      

    /**
     * Начисления и оплаты для графика мониторинга
     * @param {*} year 
     * @param {*} service 
     * @param {*} call 
     */
    charge.MonitoringCharge = function(year,service,region,enterprise,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
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
            let output = {};
            output['Charge'] = [];
            output['Payments'] = [];
            let resCharge = output['Charge'];
            let resPayments = output['Payments'];
            for(let i = 0; i<12; i++) {
                resCharge[i] = {sumDebet:0,sumCredit:0,difference:0};
                resPayments[i] = {sumDebet:0,sumCredit:0,difference:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let where = ' and 0 =';
            let indEnt = 0;
            if( enterprise !== undefined ) {
                where = ' and management_enterprise_id = ';
                indEnt = enterprise;
            }
            let query = new QueryStream('SELECT sum(sum) AS sum,0 AS sumPay,period,2 AS type '+
                                        'FROM stack.charge_resourse t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' + 
                                        'WHERE period >= $1 and period <= $2 and service_id = ANY ($3) and a.region = $4 '+
                                        where + '$5 ' +
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(sum)+sum(recalculate)-sum(quality) AS sum,0 AS sumPay,period,1 AS type '+
                                        'FROM stack.charge t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' + 
                                        'WHERE period >= $6 and period <= $7 and service_id = ANY ($8) and a.region = $9 '+
                                        where + '$10 ' +
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT 0 AS sum,sum(sum) AS sumPay,period,2 AS type '+
                                        'FROM stack.payment_resourse t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' + 
                                        'WHERE period >= $11 and period <= $12 and service_id = ANY ($13) and a.region = $14 '+
                                        where + '$15 ' +
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT 0 AS sum,sum(sum) AS sumPay,period,1 AS type '+
                                        'FROM stack.payment t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' + 
                                        'WHERE period >= $16 and period <= $17 and service_id = ANY ($18) and a.region = $19 '+
                                        where + '$20 ' +
                                        'GROUP BY period '
                                        ,[monthStart,monthEnd,res,region,indEnt,monthStart,monthEnd,res,region,indEnt,monthStart,monthEnd,res,region,indEnt,monthStart,monthEnd,res,region,indEnt],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let periodMonth = +data.period.getMonth();
                if( data.type === 1 ) {
                    resCharge[periodMonth].sumDebet += +data.sum;
                    resPayments[periodMonth].sumDebet += +data.sumpay;
                } else {
                    resCharge[periodMonth].sumCredit += +data.sum;
                    resPayments[periodMonth].sumCredit += +data.sumpay;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let max = 0;
                let length = resCharge.length;
                for(let ind = 0; ind < length; ind++) {
                    resCharge[ind].sumDebet = Number(resCharge[ind].sumDebet.toFixed(2));
                    resCharge[ind].sumCredit = Number(resCharge[ind].sumCredit.toFixed(2));
                    resCharge[ind].difference = (resCharge[ind].sumCredit - resCharge[ind].sumDebet).toFixed(2);
                    max = Math.max(max,resCharge[ind].sumDebet,resCharge[ind].sumCredit);
                }
                resCharge.unshift({max:max.toFixed(2)});
                max = 0;
                length = resPayments.length;
                for(let ind = 0; ind < length; ind++) {
                    resPayments[ind].sumDebet = Number(resPayments[ind].sumDebet.toFixed(2));
                    resPayments[ind].sumCredit = Number(resPayments[ind].sumCredit.toFixed(2));
                    resPayments[ind].difference = (resPayments[ind].sumCredit - resPayments[ind].sumDebet).toFixed(2);
                    max = Math.max(max,resPayments[ind].sumDebet,resPayments[ind].sumCredit);
                }
                resPayments.unshift({max:max.toFixed(2)});
                call(null,output);
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
     */
    charge.remoteMethod(
        'MonitoringCharge', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'MonitoringCharge', type: 'string'},
            description: ('Начисления и оплаты для графика мониторинга')
        }
    )

    /**
     * Объемы для графика мониторинга
     * @param {*} year 
     * @param {*} service 
     * @param {*} call 
     */
    charge.MonitoringAmount = function(year,service,region,enterprise,call) {

        let monthStart = moment([year, 0,1]).format();
        let monthEnd = moment([year, 11,1,23]).format();
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
            let output = [];
            for(let i = 0; i<12; i++) {
                output[i] = {amountDebet:0,amountCredit:0};
            }
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let where = ' and 0 =';
            let indEnt = 0;
            if( enterprise !== undefined ) {
                where = ' and management_enterprise_id = ';
                indEnt = enterprise;
            }
            let query = new QueryStream('SELECT sum(amount) AS amount,period,2 AS type '+
                                        'FROM stack.charge_resourse t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                        'WHERE period >= $1 and period <= $2 and service_id = ANY ($3) and a.region = $4 '+
                                        where + '$5 ' +
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(amount) AS amount,period,1 AS type '+
                                        'FROM stack.charge t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                        'WHERE period >= $6 and period <= $7 and service_id = ANY ($8) and a.region = $9 '+
                                        where + '$10 ' +
                                        'GROUP BY period '
                                        ,[monthStart,monthEnd,res,region,indEnt,monthStart,monthEnd,res,region,indEnt],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let periodMonth = +data.period.getMonth();
                if( data.type === 1 ) {
                    output[periodMonth].amountDebet += +data.amount;
                } else {
                    output[periodMonth].amountCredit += +data.amount;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let max = 0;
                let length = output.length;
                for(let ind = 0; ind < length; ind++) {
                    output[ind].amountDebet = Number(output[ind].amountDebet.toFixed(5));
                    output[ind].amountCredit = Number(output[ind].amountCredit.toFixed(5));
                    max = Math.max(max,output[ind].amountDebet,output[ind].amountCredit);
                }
                output.unshift({max:max.toFixed(5)});
                call(null,output);
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
     */
    charge.remoteMethod(
        'MonitoringAmount', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'MonitoringAmount', type: 'string'},
            description: ('Объемы для графика мониторинга')
        }
    )
    
};