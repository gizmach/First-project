'use strict';
const importBalance = require("../helpers/import/importBalance");
const loopback = require('loopback');
const accordServicesArray = require('../helpers/accords/accordServicesArray');
const accordServicesTrue= require('../helpers/accords/accordServicesTrue');
const ServicesProperties = require('../helpers/accords/accordProperties');
const ServicesTypes = ServicesProperties.ServicesTypes;
const ServicesUnit = ServicesProperties.ServicesUnit;
const moment = require('moment');
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const modelConfig = require('../../server/datasources.json').stackPostgreDb;
const Excel = require('exceljs');
const fs = require('fs');

module.exports = function(balance) {

    /**
     * Метод подкачки данных
     */
    balance.insertData = function(url,call) {
        importBalance(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    balance.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Balance')
        }
    )

    /**
     * Метод возвращает сумму задолженности по населению
     * с указанием конкретной услуги и организации-дебитора
     * Третья страница
     */
    balance.debtDebetService = function(month,service,idDebet,region,call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1]-1,1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1]-1,1,23]).format();
        let arrayService = [];
        let arrayAddress = [];
        if( idDebet === undefined ) {
            call(null,{});
            return '';
        }
        new Promise((resolve,reject) => {
            let indexFinal = 0;
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
            .then(res => {
                if( res.length > 0) {
                    arrayService = res;
                    if( indexFinal === 1 ) {
                        resolve(res);
                    }
                    indexFinal++;
                } else {
                    reject('Таких услуг не существует');
                }
            })
            let Address = loopback.findModel('Address_Ref');
            Address.find({},function(err, result) {
                if( err !== null ) {
                    reject(err.message,{});
                    return '';
                }
                let length = result.length;
                for(let i = 0; i < length; i++) {
                    arrayAddress[result[i].id] = result[i];
                }
                if( indexFinal === 1 ) {
                    resolve(result);
                }
                indexFinal++;
            })
        }).then( () => {
            let resSum = {};
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum)+sum(recalculate)+sum(quality) AS sum,address_id '+
                                        'FROM ( '+
                                            'SELECT -sum AS sum,-recalculate AS recalculate,quality,address_id '+
                                            'FROM stack.charge '+
                                            'WHERE period >= $1 and period <= $2 and management_enterprise_id = $3 and service_id = ANY ($4) '+
                                            'UNION ALL '+
                                            'SELECT sum,0,0,address_id '+
                                            'FROM stack.balance '+
                                            'WHERE period >= $5 and period <= $6 and management_enterprise_id = $7 and service_id = ANY ($8) '+
                                        ') AS data '+
                                        'JOIN stack.address_ref r on data.address_id = r.id ' +
                                        'WHERE region = $9 ' +
                                        'GROUP BY address_id'
                                        ,[monthStart,monthEnd,idDebet,arrayService,monthStart,monthEnd,idDebet,arrayService,region],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let id = data.address_id;
                if( !resSum[id] ) {
                    resSum[id] = {sum:0,name:arrayAddress[id].name};
                }
                resSum[id].sum += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let output = [];
                for(let key in resSum) {
                    resSum[key].sum = resSum[key].sum > 0 ? resSum[key].sum.toFixed(2) : 0;
                    output.push(resSum[key]);
                }
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
     * месяц передается в формате yyyy-mm-dd
     */
    balance.remoteMethod(
        'debtDebetService', {
            accepts: [
                {arg: 'month', type: 'string',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'id', type: 'number',"required": false},
                {arg: 'region', type: 'number',"required": false}
            ],
            returns: {arg: 'debtDebetService', type: 'string'},
            description: ('Сумма задолженности')
        }
    )


    /**
     * Метод возвращает сумму задолженности организации-дебитора
     * перед кредиторами с начислениями и оплатой
     * Пятая страница
     */
    balance.debtDebet = function(month,idDebet,region,call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1]-1,1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1]-1,1,23]).format();
        let lastMonth = moment(month).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        let arraylastMonth = lastMonth.split('-');
        let lastMonthStart = moment([arraylastMonth[0], +arraylastMonth[1]-1,1]).format();
        let lastMonthEnd = moment([arraylastMonth[0], +arraylastMonth[1]-1,1,23]).format();
        let arrayService2 = [];
        let arrayEnterprise = [];
        let electric = ServicesTypes.electric;
        let heat = ServicesTypes.heat;
        let water = ServicesTypes.water;
        let gas = ServicesTypes.gas;
        new Promise((resolve,reject) => {
            let indexFinal = 0;
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({},function(error, result) {
                if( error !== null ) {
                    reject(error.message,{});
                    return '';
                }
                let length = result.length;
                for(let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if( indexFinal === 1 ) {
                    resolve(result);
                }
                indexFinal++;
            })
            let Service = loopback.findModel('Service_Ref');
            Service.find({},function(err, result) {
                if( err !== null ) {
                    reject(err.message,{});
                    return '';
                }
                let length = result.length;
                for(let i = 0; i < length; i++) {
                    arrayService2[result[i].id] = result[i];
                }
                if( indexFinal === 1 ) {
                    resolve(result);
                }
                indexFinal++;
            })
        }).then( () => {
            let output = {};
            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT 0 AS sum,sum(sum) AS sumPay,0 AS sumBal,0 AS sumLastBal,0 AS amount,resource_enterprise_id,service_id '+
                                        'FROM stack.payment t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $1 and period <= $2 and management_enterprise_id = $3 AND region = $4 '+
                                        'GROUP BY resource_enterprise_id,service_id '+
                                        'UNION ALL '+
                                        'SELECT sum(sum)+sum(recalculate)-sum(quality) AS sum,0 AS sumPay,0 AS sumBal,0 AS sumLastBal,sum(amount) AS amount,resource_enterprise_id,service_id '+
                                        'FROM stack.charge t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $5 and period <= $6 and management_enterprise_id = $7 AND region = $8 '+
                                        'GROUP BY resource_enterprise_id,service_id '+
                                        'UNION ALL '+
                                        'SELECT 0 AS sum,0 AS sumPay,sum(sum) AS sumBal,0 AS sumLastBal,0 AS amount,resource_enterprise_id,service_id '+
                                        'FROM stack.balance t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $9 and period <= $10 and management_enterprise_id = $11 AND region = $12 '+
                                        'GROUP BY resource_enterprise_id,service_id '+
                                        'UNION ALL '+
                                        'SELECT 0 AS sum,0 AS sumPay,0 AS sumBal,sum(sum) AS sumLastBal,0 AS amount,resource_enterprise_id,service_id '+
                                        'FROM stack.balance t '+
                                        'JOIN stack.address_ref r on t.address_id = r.id ' +
                                        'WHERE period >= $13 and period <= $14 and management_enterprise_id = $15 AND region = $16 '+
                                        'GROUP BY resource_enterprise_id,service_id '
                                        ,[monthStart,monthEnd,idDebet,region,monthStart,monthEnd,idDebet,region,monthStart,monthEnd,idDebet,region,lastMonthStart,lastMonthEnd,idDebet,region],{batchSize:1000});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let idEnterprise = data.resource_enterprise_id;
                let idService = data.service_id;
                if( !output[idEnterprise] ) {
                    output[idEnterprise] = {amount:0,sumCharge:0,sumPayment:0,lastBalance:0,sumBalance:0,increase:true,name:"",unit:''};
                }
                output[idEnterprise].sumCharge += +data.sum;
                output[idEnterprise].amount += +data.amount;
                output[idEnterprise].sumPayment += +data.sumpay;
                output[idEnterprise].sumBalance += +data.sumbal;
                output[idEnterprise].lastBalance += +data.sumlastbal;
                if( accordServicesTrue(arrayService2[idService].code,electric) === true ) {
                    if( !output[idEnterprise][electric] ) {
                        output[idEnterprise][electric] = {amount:0,sumCharge:0,sumPayment:0,lastBalance:0,sumBalance:0,increase:true,name:"",unit:ServicesUnit.electric};
                    }
                    output[idEnterprise][electric].sumCharge  += +data.sum;
                    output[idEnterprise][electric].amount += +data.amount;
                    output[idEnterprise][electric].sumPayment += +data.sumpay;
                    output[idEnterprise][electric].sumBalance += +data.sumbal;
                    output[idEnterprise][electric].lastBalance += +data.sumlastbal;
                } else if( accordServicesTrue(arrayService2[idService].code,heat)  === true ) {
                    if( !output[idEnterprise][heat] ) {
                        output[idEnterprise][heat] = {amount:0,sumCharge:0,sumPayment:0,lastBalance:0,sumBalance:0,increase:true,name:"",unit:ServicesUnit.heat};
                    }
                    output[idEnterprise][heat].sumCharge  += +data.sum;
                    output[idEnterprise][heat].amount += +data.amount;
                    output[idEnterprise][heat].sumPayment += +data.sumpay;
                    output[idEnterprise][heat].sumBalance += +data.sumbal;
                    output[idEnterprise][heat].lastBalance += +data.sumlastbal;
                } else if( accordServicesTrue(arrayService2[idService].code,water)  === true ) {
                    if( !output[idEnterprise][water] ) {
                        output[idEnterprise][water] = {amount:0,sumCharge:0,sumPayment:0,lastBalance:0,sumBalance:0,increase:true,name:"",unit:ServicesUnit.water};
                    }
                    output[idEnterprise][water].sumCharge  += +data.sum;
                    output[idEnterprise][water].amount += +data.amount;
                    output[idEnterprise][water].sumPayment += +data.sumpay;
                    output[idEnterprise][water].sumBalance += +data.sumbal;
                    output[idEnterprise][water].lastBalance += +data.sumlastbal;
                } else if( accordServicesTrue(arrayService2[idService].code,gas)  === true ) {
                    if( !output[idEnterprise][gas] ) {
                        output[idEnterprise][gas] = {amount:0,sumCharge:0,sumPayment:0,lastBalance:0,sumBalance:0,increase:true,name:"",unit:ServicesUnit.gas};
                    }
                    output[idEnterprise][gas].sumCharge  += +data.sum;
                    output[idEnterprise][gas].amount += +data.amount;
                    output[idEnterprise][gas].sumPayment += +data.sumpay;
                    output[idEnterprise][gas].sumBalance += +data.sumbal;
                    output[idEnterprise][gas].lastBalance += +data.sumlastbal;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                for(let key in output ) {
                    let outputin = [];
                    let count = 0;
                    let unit = '';
                    for(let keyin in output[key] ) {
                        if( typeof(output[key][keyin]) === 'object' ) {
                            output[key][keyin].sumCharge = output[key][keyin].sumCharge.toFixed(2)+' / '+output[key][keyin].amount.toFixed(5) +' '+ output[key][keyin].unit;
                            output[key][keyin].sumPayment = output[key][keyin].sumPayment.toFixed(2);
                            output[key][keyin].lastBalance = output[key][keyin].lastBalance.toFixed(2);
                            output[key][keyin].sumBalance = output[key][keyin].sumBalance.toFixed(2);
                            if( output[key][keyin].sumBalance - output[key][keyin].lastBalance <= 0  ) {
                                output[key][keyin].increase = false;
                            }
                            count++;
                            Object.assign(output[key][keyin],{id:key,service:keyin});
                            outputin.push(output[key][keyin]);
                            unit = output[key][keyin].unit;
                            delete(output[key][keyin]);
                        }
                    }
                    if( output[key].sumBalance - output[key].lastBalance > 0  ) {
                        output[key].increase = false;
                    }
                    output[key].name = key <= 0 ? 'Население' : arrayEnterprise[key].short_name;
                    output[key].sumPayment = output[key].sumPayment.toFixed(2);
                    output[key].lastBalance = output[key].lastBalance.toFixed(2);
                    output[key].sumBalance = output[key].sumBalance.toFixed(2);
                    output[key].sumCharge = count > 1 ? output[key].sumCharge.toFixed(2) : output[key].sumCharge.toFixed(2)+' / '+output[key].amount.toFixed(5) +' '+ unit;
                    Object.assign(output[key],{id:key});
                    total.push(output[key]);
                    if( count > 1 ) {
                        let arrayTemp = total[total.length-1];
                        Object.assign(arrayTemp,outputin);
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
    balance.remoteMethod(
        'debtDebet', {
            accepts: [
                {arg: 'month', type: 'string',"required": true},
                {arg: 'id', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'debtDebet', type: 'string'},
            description: ('Общая сумма задолженности')
        }
    )

    /**
     * Долги для графика мониторинга
     * @param {*} year
     * @param {*} service
     * @param {*} call
     */
    balance.MonitoringBalance = function(year,service,region,enterprise,call) {

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
                output[i] = {sumDebet:0,sumCredit:0,difference:0};
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
            let query = new QueryStream('SELECT sum(sum)+sum(recalculate)+sum(quality) AS sum,period,1 AS type '+
                                        'FROM ( '+
                                            'SELECT -sum AS sum,-recalculate AS recalculate,quality,period,address_id,management_enterprise_id '+
                                            'FROM stack.charge '+
                                            'WHERE period >= $1 and period <= $2 and service_id = ANY ($3) '+
                                            'UNION ALL '+
                                            'SELECT sum,0,0,period,address_id,management_enterprise_id '+
                                            'FROM stack.balance '+
                                            'WHERE period >= $4 and period <= $5 and service_id = ANY ($6) '+
                                        ') AS data '+
                                        'JOIN stack.address_ref a ON data.address_id = a.id ' +
                                        'WHERE a.region =  $7 ' + where + '$8 ' +
                                        'GROUP BY period '+
                                        'UNION ALL '+
                                        'SELECT sum(sum) AS sum,period,2 AS type '+
                                        'FROM ( '+
                                            'SELECT -sum AS sum,period,address_id,management_enterprise_id '+
                                            'FROM stack.charge_resourse '+
                                            'WHERE period >= $9 and period <= $10 and service_id = ANY ($11) '+
                                            'UNION ALL '+
                                            'SELECT sum,period,address_id,management_enterprise_id '+
                                            'FROM stack.balance_resourse '+
                                            'WHERE period >= $12 and period <= $13 and service_id = ANY ($14) '+
                                        ') AS data '+
                                        'JOIN stack.address_ref a ON data.address_id = a.id ' + 
                                        'WHERE a.region =  $15 ' + where + '$16 ' +
                                        'GROUP BY period'
                                        ,[monthStart,monthEnd,res,monthStart,monthEnd,res,region,indEnt,monthStart,monthEnd,res,monthStart,monthEnd,res,region,indEnt],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let periodMonth = +data.period.getMonth();
                if( data.type === 1 ) {
                    output[periodMonth].sumDebet += +data.sum;
                } else {
                    output[periodMonth].sumCredit += +data.sum;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let max = 0;
                let length = output.length;
                for(let ind = 0; ind < length; ind++) {
                    output[ind].sumDebet = Number(output[ind].sumDebet.toFixed(2));
                    output[ind].sumCredit = Number(output[ind].sumCredit.toFixed(2));
                    output[ind].difference = (output[ind].sumCredit - output[ind].sumDebet).toFixed(2);
                    max = Math.max(max,output[ind].sumDebet,output[ind].sumCredit);
                }
                output.unshift({max:max.toFixed(2)});
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
    balance.remoteMethod(
        'MonitoringBalance', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'MonitoringBalance', type: 'string'},
            description: ('Долги для графика мониторинга')
        }
    )

    /**
     * Генерация новых данных
     * @param {*} call
     */
    balance.GenerateData = function(call) {

        let monthStart = moment([2016, 0,1]).format('YYYY-MM-DD');
        let monthEnd = moment([2016, 11,1]).format('YYYY-MM-DD');
        balance.find({
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
                for(let ind = 2008; ind < 2018; ind++) {
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
            balance.create(data,{},function(req,res) {
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
    balance.remoteMethod(
        'GenerateData', {
            returns: {arg: 'GenerateData', type: 'string'},
            description: ('Генерация данных')
        }
    )

    /**
     * Детализация объемов для графика мониторинга
     * если передать третьим параметром 1, то произойдет выгрузка в excel
     * @param {*} year
     * @param {*} service
     * @param {*} call
     */
    balance.MonitoringAmountDetail = function(monthS,monthE,service,region,excel,enterprise,call) {

        let arrayMonth = monthS.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1]-1,1]).format();
        arrayMonth = monthE.split('-');
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1]-1,1,23]).format();
        let arrayEnterprise = [];
        let arrayService = [];
        new Promise((resolve,reject) => {
            let indexFinal = 0;
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
            .then(res => {
                if( res.length > 0) {
                    arrayService = res;
                    if( indexFinal === 1 ) {
                        resolve(res);
                    }
                    indexFinal++;
                } else {
                    reject('Таких услуг не существует');
                }
            })
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({},function(error, result) {
                if( error !== null ) {
                    reject(error.message,{});
                    return '';
                }
                let length = result.length;
                for(let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if( indexFinal === 1 ) {
                    resolve(result);
                }
                indexFinal++;
            })
        }).then( () => {
            let output = {};
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
            let query = new QueryStream('SELECT sum(amount) AS amount,management_enterprise_id,1 AS type '+
                                        'FROM stack.charge t ' +
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                        'WHERE period >= $1 and period <= $2 and service_id = ANY ($3) and a.region = $4 '+
                                        where + '$5 ' +
                                        'GROUP BY management_enterprise_id '+
                                        'UNION ALL '+
                                        'SELECT sum(amount) AS amount,management_enterprise_id,2 AS type '+
                                        'FROM stack.charge_resourse t '+
                                        'JOIN stack.address_ref a ON t.address_id = a.id ' +
                                        'WHERE period >= $6 and period <= $7 and service_id = ANY ($8) and a.region = $9 '+
                                        where + '$10 ' +
                                        'GROUP BY management_enterprise_id'
                                        ,[monthStart,monthEnd,arrayService,region,indEnt,monthStart,monthEnd,arrayService,region,indEnt],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                let id = data.management_enterprise_id;
                if( !output[id] ) {
                    output[id] = {amountDebet:0,amountCredit:0};
                }
                if( data.type === 1 ) {
                    output[id].amountDebet += +data.amount;
                } else {
                    output[id].amountCredit += +data.amount;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let total = [];
                let amountDebetAll = 0;
                let amountCreditAll = 0;
                let differenceAll = 0;
                let maxName = 0;
                for(let ind in output ) {
                    output[ind].amountDebet = Number(output[ind].amountDebet.toFixed(5));
                    output[ind].amountCredit = Number(output[ind].amountCredit.toFixed(5));
                    if( output[ind].amountDebet > 0 || output[ind].amountCredit > 0 ) {
                        let difference = +(output[ind].amountDebet - output[ind].amountCredit).toFixed(5);
                        amountDebetAll += output[ind].amountDebet;
                        amountCreditAll += output[ind].amountCredit;
                        differenceAll += difference;
                        let name = +ind === -1 ? 'Население' : arrayEnterprise[ind].short_name;
                        maxName = Math.max(maxName,name.length);
                        total.push({amountDebet:output[ind].amountDebet,amountCredit:output[ind].amountCredit,difference:difference,name:name});
                    }
                }
                total.sort(function(a, b) {
                    return a.amountCredit - b.amountCredit;
                }).reverse();
                total.push({amountDebet:amountDebetAll.toFixed(5),amountCredit:amountCreditAll.toFixed(5),difference:differenceAll.toFixed(5),name:'Итого',unit:ServicesUnit[ServicesTypes[service]]});
                if( excel !== undefined & excel > 0 ) {
                    let workbook = new Excel.Workbook();
                    let sheet = workbook.addWorksheet('Детализация');
                    sheet.columns = [
                        { header: 'Название', key: 'name', width: maxName+5, },
                        { header: 'Данные РСО', key: 'amountCredit', width: 15, style: { numFmt: '#,###,##0.00;-#,###,##0.00'} },
                        { header: 'Данные УО', key: 'amountDebet', width: 15, style: { numFmt: '#,###,##0.00;-#,###,##0.00'}  },
                        { header: 'Разрыв', key: 'difference', width: 15, style: { numFmt: '#,###,##0.00;-#,###,##0.00'} }
                    ];
                    sheet.addRows(total);
                    sheet.getRow(1).alignment = { horizontal: 'center' };
                    sheet.getRow(1).font = { bold: true };
                    sheet.getRow(+total.length+1).font = { bold: true };
                    let length = total.length;
                    for( let index = 1; index < length+2; index++ ) {
                        sheet.getRow(index).eachCell(function(cell) {
                            cell.border = {
                                top: {style:'thin'},
                                left: {style:'thin'},
                                bottom: {style:'thin'},
                                right: {style:'thin'}
                            };
                        })
                    }
                    const mainName = 'amount_';
                    let fileName = mainName + Math.random().toString(36).replace(/[^a-z]+/g, '') + '.xlsx';
                    let path = '/api/assets/reports/download/' + fileName;
                    let pathFile = require('path').resolve('assets/reports/' + fileName);
                  //  fs.stat(path, (callback) => {
                      //  if( callback !== null ) {
                      //      fs.mkdir(path, (callback) => {
                      //          if( callback !== null ) {
                      //              call('Не удалось создать каталог');
                      //          } else {
                      //              workbook.xlsx.writeFile(pathFile).then(function() {
                      //                  call(null,path);
                      //              })
                      //          }
        //
                      //      })
                      //  } else {
                            workbook.xlsx.writeFile(pathFile).then(function() {
                                call(null,path);
                            });
                       // }
                   // })
                } else {
                    call(null,total);
                }
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
    balance.remoteMethod(
        'MonitoringAmountDetail', {
            accepts: [
                {arg: 'monthS', type: 'string',"required": true},
                {arg: 'monthE', type: 'string',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true},
                {arg: 'excel', type: 'number',"required": false},
                {arg: 'enterprise', type: 'number',"required": false}
            ],
            returns: {arg: 'MonitoringAmountDetail', type: 'string'},
            description: ('Детализация объемов для графика мониторинга')
        }
    )

}
