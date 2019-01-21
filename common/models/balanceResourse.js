'use strict';
const importBalanceResourse = require("../helpers/import/importBalanceResourse");
const loopback = require('loopback');
const accordServicesArray = require('../helpers/accords/accordServicesArray');
const accordServicesTrue = require('../helpers/accords/accordServicesTrue');
const moment = require('moment');
const ServicesProperties = require('../helpers/accords/accordProperties');
const ServicesTypes = ServicesProperties.ServicesTypes;
const ServicesUnit = ServicesProperties.ServicesUnit;
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const modelConfig = require('../../server/datasources.json').stackPostgreDb;
const { AddressName } = require('../helpers/accords/accordAddress');
const { RegionName } = require('../helpers/accords/accordAddress');

module.exports = function (BalanceResourse) {

    /**
     * описание метода
     */
    BalanceResourse.insertData = function (url, call) {

        importBalanceResourse(url);
        call(null, "что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    BalanceResourse.remoteMethod(
        'insertData', {
            accepts: { arg: 'path', type: 'string', "required": true },
            returns: { arg: 'Итог', type: 'string' },
            description: ('Подкачка из файла в таблицу Balance_Resourse')
        }
    )

    /**
     * Метод возвращает топ организаций для первой страницы
     */
    BalanceResourse.FirstPageTopOfEnterprisesData = function (month, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayEnterprise = [];
        new Promise((resolve, reject) => {
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message);
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                resolve(result);
            })
        }).then(() => {
            let outputEnterprise = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream(
                'SELECT sum(sum) AS sum,management_enterprise_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,management_enterprise_id,address_id ' +
                    'FROM stack.charge_resourse ' +
                    'WHERE period >= $1 and period <= $2 ' +
                    'UNION ALL ' +
                    'SELECT sum,management_enterprise_id,address_id ' +
                    'FROM stack.balance_resourse ' +
                    'WHERE period >= $3 and period <= $4 ' +
                ') AS data ' +
                'JOIN stack.address_ref r on data.address_id = r.id ' +
                'WHERE region = $5 ' +
                'GROUP BY management_enterprise_id'
                , [monthStart, monthEnd, monthStart, monthEnd, region], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let id = data.management_enterprise_id;
                if (+id > 0) {
                    if (!outputEnterprise[id]) {
                        outputEnterprise[id] = { sum: 0, name: arrayEnterprise[id].short_name, increase: true };
                    }
                    outputEnterprise[id].sum += +data.sum;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                call(null, outputEnterprise);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'FirstPageTopOfEnterprisesData', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'FirstPageTopOfEnterprisesData', type: 'string' },
            description: ('Метод возвращает топ организаций для первой страницы')
        }
    )

    /**
     * Метод возвращает топ организаций для первой страницы
     */
    BalanceResourse.FirstPageTopOfEnterprises = function (month, region, call) {

        let indexFinal = 0;
        let resBalanceEnterprise = {};
        BalanceResourse.FirstPageTopOfEnterprisesData(month, region, function (error, result) {
            if (error !== null) {
                call(error.message, {});
                return '';
            }
            if (indexFinal === 1) {
                let arrayOutput = [];
                for (let key in result) {
                    if (resBalanceEnterprise[key] === undefined) {
                        result[key].increase = +result[key].sum >= 0;
                    } else {
                        result[key].increase = (+result[key].sum - +resBalanceEnterprise[key].sum) >= 0;
                    }
                    if (result[key].sum > 0) {
                        result[key].sum = result[key].sum.toFixed(2);
                        arrayOutput.push(result[key]);
                    }
                }
                arrayOutput.sort(function (a, b) {
                    return a.sum - b.sum;
                }).reverse();
                call(null, arrayOutput.slice(0, 10));
                return '';
            }
            indexFinal = 1;
            resBalanceEnterprise = result;
        })
        BalanceResourse.FirstPageTopOfEnterprisesData(moment(month).subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), region, function (error, result) {
            if (error !== null) {
                call(error.message, {});
                return '';
            }
            if (indexFinal === 1) {
                let arrayOutput = [];
                for (let key in resBalanceEnterprise) {
                    if (result[key] === undefined) {
                        resBalanceEnterprise[key].increase = +resBalanceEnterprise[key].sum >= 0;
                    } else {
                        resBalanceEnterprise[key].increase = (+resBalanceEnterprise[key].sum - +result[key].sum) >= 0;
                    }
                    if (resBalanceEnterprise[key].sum > 0) {
                        resBalanceEnterprise[key].sum = resBalanceEnterprise[key].sum.toFixed(2);
                        arrayOutput.push(resBalanceEnterprise[key]);
                    }
                }
                arrayOutput.sort(function (a, b) {
                    return a.sum - b.sum;
                }).reverse();
                call(null, arrayOutput.slice(0, 10));
                return '';
            }
            indexFinal = 1;
            resBalanceEnterprise = result;
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'FirstPageTopOfEnterprises', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'TopOfEnterprises', type: 'string' },
            description: ('Метод возвращает топ организаций для первой страницы')
        }
    )

    /**
     * Метод возвращает HeaderSum для первой страницы
     */
    BalanceResourse.FirstPageHeaderSum = function (month, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let headerSum = 0;
        let client = new pg.Client(modelConfig);
        client.connect(function (error) {
            if (error !== null) {
                call(error);
                return '';
            }
        });
        let query = new QueryStream(
            'SELECT sum(sum) AS sum ' +
            'FROM ( ' +
                'SELECT -sum AS sum,address_id  ' +
                'FROM stack.charge_resourse ' +
                'WHERE period >= $1 and period <= $2 ' +
                'UNION ALL ' +
                'SELECT sum,address_id  ' +
                'FROM stack.balance_resourse ' +
                'WHERE period >= $3 and period <= $4 ' +
            ') AS data ' +
            'JOIN stack.address_ref r on data.address_id = r.id ' +
            'WHERE region = $5 ' 
            , [monthStart, monthEnd, monthStart, monthEnd, region], { batchSize: 10 });
        let streamQuery = client.query(query);
        streamQuery.on('data', (data) => {
            headerSum = +data.sum > 0 ? +data.sum : 0;
        })
        streamQuery.on('end', () => {
            client.end();
            call(null, +headerSum.toFixed(2));
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
    BalanceResourse.remoteMethod(
        'FirstPageHeaderSum', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'headerSum', type: 'string' },
            description: ('Метод возвращает HeaderSum для первой страницы')
        }
    )

    /**
     * Метод возвращает суммы по ресурсам для первой страницы
     */
    BalanceResourse.FirstPageTopOfServicesData = function (month, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayService2 = [];
        let electric = ServicesTypes.electric;
        let heat = ServicesTypes.heat;
        let water = ServicesTypes.water;
        let gas = ServicesTypes.gas;
        new Promise((resolve, reject) => {
            let Service = loopback.findModel('Service_Ref');
            Service.find({}, function (error, res) {
                if (error !== null) {
                    reject(error.message);
                }
                let length = res.length;
                for (let i = 0; i < length; i++) {
                    arrayService2[res[i].id] = res[i];
                }
                resolve(res);
            })
        }).then(() => {
            let outputService = {};
            outputService[electric] = { sum: 0, 'increase': true };
            outputService[heat] = { sum: 0, 'increase': true };
            outputService[water] = { sum: 0, 'increase': true };
            outputService[gas] = { sum: 0, 'increase': true };
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,service_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,service_id,address_id  ' +
                    'FROM stack.charge_resourse ' +
                    'WHERE period >= $1 and period <= $2 ' +
                    'UNION ALL ' +
                    'SELECT sum,service_id,address_id  ' +
                    'FROM stack.balance_resourse ' +
                    'WHERE period >= $3 and period <= $4 ' +
                ') AS data ' +
                'JOIN stack.address_ref r on data.address_id = r.id ' +
                'WHERE region = $5 ' +
                'GROUP BY service_id'
                , [monthStart, monthEnd, monthStart, monthEnd, region], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let sumTemp = +data.sum;
                let serviceTemp = arrayService2[data.service_id].code;
                if (accordServicesTrue(serviceTemp, electric) === true) {
                    outputService[electric].sum += sumTemp
                } else if (accordServicesTrue(serviceTemp, heat) === true) {
                    outputService[heat].sum += sumTemp
                } else if (accordServicesTrue(serviceTemp, water) === true) {
                    outputService[water].sum += sumTemp
                } else if (accordServicesTrue(serviceTemp, gas) === true) {
                    outputService[gas].sum += sumTemp
                }
            })
            streamQuery.on('end', () => {
                client.end();
                outputService[electric].sum = outputService[electric].sum > 0 ? outputService[electric].sum.toFixed(2) : 0;
                outputService[heat].sum = outputService[heat].sum > 0 ? outputService[heat].sum.toFixed(2) : 0;
                outputService[water].sum = outputService[water].sum > 0 ? outputService[water].sum.toFixed(2) : 0;
                outputService[gas].sum = outputService[gas].sum > 0 ? outputService[gas].sum.toFixed(2) : 0;
                call(null, outputService);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'FirstPageTopOfServicesData', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'TopOfServices', type: 'string' },
            description: ('Метод возвращает суммы по ресурсам для первой страницы')
        }
    )

    /**
     * Метод возвращает суммы по ресурсам для первой страницы
     */
    BalanceResourse.FirstPageTopOfServices = function (month, region, call) {

        let indexFinal = 0;
        let resBalance = {};
        let electric = ServicesTypes.electric;
        let heat = ServicesTypes.heat;
        let water = ServicesTypes.water;
        let gas = ServicesTypes.gas;
        BalanceResourse.FirstPageTopOfServicesData(month, region, function (error, result) {
            if (error !== null) {
                call(error, {});
                return '';
            }
            if (indexFinal === 1) {
                result[electric].increase = (+result[electric].sum - +resBalance[electric].sum).toFixed(2) >= 0;
                result[heat].increase = (+result[heat].sum - +resBalance[heat].sum).toFixed(2) >= 0;
                result[water].increase = (+result[water].sum - +resBalance[electric].sum).toFixed(2) >= 0;
                result[gas].increase = (+result[gas].sum - +resBalance[electric].sum).toFixed(2) >= 0;
                call(null, result);
                return '';
            }
            indexFinal = 1;
            resBalance = result;
        })
        BalanceResourse.FirstPageTopOfServicesData(moment(month).subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), region, function (error, result) {
            if (error !== null) {
                call(error, {});
                return '';
            }
            if (indexFinal === 1) {
                result[electric].increase = (+result[electric].sum - +resBalance[electric].sum).toFixed(2) < 0;
                result[heat].increase = (+result[heat].sum - +resBalance[heat].sum).toFixed(2) < 0;
                result[water].increase = (+result[water].sum - +resBalance[electric].sum).toFixed(2) < 0;
                result[gas].increase = (+result[gas].sum - +resBalance[electric].sum).toFixed(2) < 0;
                result[electric].sum = resBalance[electric].sum;
                result[heat].sum = resBalance[heat].sum;
                result[water].sum = resBalance[water].sum;
                result[gas].sum = resBalance[gas].sum;
                call(null, result);
                return '';
            }
            indexFinal = 1;
            resBalance = result;
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'FirstPageTopOfServices', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'TopOfServices', type: 'string' },
            description: ('Метод возвращает суммы по ресурсам для первой страницы')
        }
    )

    /**
     * Метод возвращает суммы по регионам для первой страницы
     */
    BalanceResourse.FirstPageAreasData = function (month, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let client = new pg.Client(modelConfig);
        let output = {};
        client.connect(function (error) {
            if (error !== null) {
                call(error);
                return '';
            }
        });
        let query = new QueryStream(
            'SELECT sum(sum) AS sum,r.district ' +
            'FROM ( ' +
                'SELECT -sum AS sum,address_id ' +
                'FROM stack.charge_resourse t ' +
                'WHERE period >= $1 and period <= $2 ' +
                'UNION ALL ' +
                'SELECT sum,address_id ' +
                'FROM stack.balance_resourse t ' +
                'WHERE period >= $3 and period <= $4' +
            ') AS data ' +
            'JOIN stack.address_ref r on data.address_id = r.id ' +
            'WHERE region = $5 ' +
            'GROUP BY r.district'
            , [monthStart, monthEnd, monthStart, monthEnd, region], { batchSize: 10 });
        let streamQuery = client.query(query);
        streamQuery.on('data', (data) => {
            if (!output[data.district]) {
                output[data.district] = 0;
            }
            output[data.district] += +data.sum;
        })
        streamQuery.on('end', () => {
            client.end();
            call(null, output);
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
    BalanceResourse.remoteMethod(
        'FirstPageAreasData', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'FirstPageAreasData', type: 'string' },
            description: ('Метод возвращает суммы по регионам для первой страницы')
        }
    )

    /**
     * Метод возвращает суммы по регионам для первой страницы
     */
    BalanceResourse.FirstPageAreas = function (month, region, call) {

        let indexFinal = 0;
        let total = {};
        BalanceResourse.FirstPageAreasData(month, region, function (error, result) {
            if (error !== null) {
                call(error, {});
                return '';
            }
            if (indexFinal === 1) {
                let output = [];
                let increase = true;
                for (let key in result) {
                    if (total[key]) {
                        increase = (+result[key] - +total[key]).toFixed(2) >= 0;
                    }
                    output.push({ sum: +result[key] >= 0 ? +result[key].toFixed(2) : 0, increase: increase, name: AddressName[key], id: key });
                }
                call(null, output);
                return '';
            }
            indexFinal = 1;
            total = result;
        })
        BalanceResourse.FirstPageAreasData(moment(month).subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), region, function (error, result) {
            if (error !== null) {
                call(error, {});
                return '';
            }
            if (indexFinal === 1) {
                let output = [];
                let increase = false;
                for (let key in result) {
                    if (total[key]) {
                        increase = (+result[key] - +total[key]).toFixed(2) < 0;
                        output.push({ sum: +total[key] >= 0 ? +total[key].toFixed(2) : 0, increase: increase, name: AddressName[key], id: key });
                    }
                }
                call(null, output);
                return '';
            }
            indexFinal = 1;
            total = result;
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'FirstPageAreas', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'Areas', type: 'string' },
            description: ('Метод возвращает суммы по регионам для первой страницы')
        }
    )

    /**
     * Метод возвращает организаций-кредиторов, сгруппированный по услугам
     * и отсортированный по наличию долгов в переданном месяце
     * Вторая страница
     */
    BalanceResourse.debtDebetEnterprise = function (month, area, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayService2 = [];
        let arrayEnterprise = [];
        let electric = ServicesTypes.electric;
        let heat = ServicesTypes.heat;
        let water = ServicesTypes.water;
        let gas = ServicesTypes.gas;
        new Promise((resolve, reject) => {
            let indexFinal = 0;
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
            let Service = loopback.findModel('Service_Ref');
            Service.find({}, function (error, result) {
                if (error !== null) {
                    call(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayService2[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
        }).then(() => {
            let resSum = {};
            resSum[electric] = {};
            resSum[heat] = {};
            resSum[water] = {};
            resSum[gas] = {};
            let arrayElectric = resSum[electric];
            let arrayHeat = resSum[heat];
            let arrayWater = resSum[water];
            let arrayGas = resSum[gas];
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream(
                'SELECT sum(sum) AS sum,resource_enterprise_id,service_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,resource_enterprise_id,service_id ' +
                    'FROM stack.charge_resourse c ' +
                    'JOIN stack.address_ref a ON c.address_id = a.id ' +
                    'WHERE period >= $1 and period <= $2 and a.district = $3 ' +
                    'UNION ALL ' +
                    'SELECT sum,resource_enterprise_id,service_id ' +
                    'FROM stack.balance_resourse b ' +
                    'JOIN stack.address_ref a ON b.address_id = a.id ' +
                    'WHERE period >= $4 and period <= $5 and a.district = $6 ' +
                ') AS data ' +
                'GROUP BY resource_enterprise_id,service_id'
                , [monthStart, monthEnd, area, monthStart, monthEnd, area], { batchSize: 1000 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let sum = +data.sum;
                let id = data.resource_enterprise_id;
                let idService = data.service_id;
                if (accordServicesTrue(arrayService2[idService].code, electric) === true) {
                    if (!arrayElectric[id]) {
                        arrayElectric[id] = { sum: 0, name: arrayEnterprise[id].short_name };
                    }
                    arrayElectric[id].sum += sum;
                } else if (accordServicesTrue(arrayService2[idService].code, heat) === true) {
                    if (!arrayHeat[id]) {
                        arrayHeat[id] = { sum: 0, name: arrayEnterprise[id].short_name };
                    }
                    arrayHeat[id].sum += sum;
                } else if (accordServicesTrue(arrayService2[idService].code, water) === true) {
                    if (!arrayWater[id]) {
                        arrayWater[id] = { sum: 0, name: arrayEnterprise[id].short_name };
                    }
                    arrayWater[id].sum += sum;
                } else if (accordServicesTrue(arrayService2[idService].code, gas) === true) {
                    if (!arrayGas[id]) {
                        arrayGas[id] = { sum: 0, name: arrayEnterprise[id].short_name };
                    }
                    arrayGas[id].sum += sum;
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let output = {};
                for (let key in resSum) {
                    if (!output[key]) {
                        output[key] = [];
                    }
                    let arrayTemp = output[key];
                    for (let keyin in resSum[key]) {
                        if (resSum[key][keyin].sum > 0) {
                            arrayTemp.push({ value: keyin, text: resSum[key][keyin].name });
                        }
                    }
                }
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'debtDebetEnterprise', {
            accepts: [
                {arg: 'month', type: 'string',"required": true},
                {arg: 'area', type: 'number',"required": true}
            ],
            returns: { arg: 'debtDebetEnterprise', type: 'string' },
            description: ('Сумма задолженности')
        }
    )

    /**
     * Метод возвращает суммы кредиторов по услугам
     * Вторая страница
     */
    BalanceResourse.SecondPageSumEnterprises = function (month, area, service, idCredit, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        new Promise((resolve, reject) => {
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
                .then(res => {
                    if (res.length > 0) {
                        resolve(res);
                    } else {
                        reject('Таких услуг не существует');
                    }
                })
        }).then(res => {
            let resSumCredit = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream(
                'SELECT sum(sum) AS sum,management_enterprise_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,management_enterprise_id ' +
                    'FROM stack.charge_resourse c ' +
                    'JOIN stack.address_ref a ON c.address_id = a.id ' +
                    'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) and a.district = $5 ' +
                    'UNION ALL ' +
                    'SELECT sum,management_enterprise_id ' +
                    'FROM stack.balance_resourse b ' +
                    'JOIN stack.address_ref a ON b.address_id = a.id ' +
                    'WHERE period >= $6 and period <= $7 and resource_enterprise_id = $8 and service_id = ANY ($9) and a.district = $10 ' +
                ') AS data ' +
                'GROUP BY management_enterprise_id'
                , [monthStart, monthEnd, idCredit, res, area, monthStart, monthEnd, idCredit, res, area], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let idCredit = data.management_enterprise_id === -1 ? -1 : 1;
                if (!resSumCredit[idCredit]) {
                    resSumCredit[idCredit] = { sum: 0, type: idCredit > 0 ? "УК" : "Население", percent: 0 };
                }
                resSumCredit[idCredit].sum += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let output = [];
                let totalSum = 0;
                for (let key in resSumCredit) {
                    if( resSumCredit[key].sum >= 0 ) {
                        totalSum += +resSumCredit[key].sum.toFixed(2);
                    } else {
                        delete(resSumCredit[key]);
                    }
                }
                totalSum = Number(totalSum.toFixed(2));
                if (totalSum <= 0) {
                    totalSum = 0;
                } else {
                    output.push({ totalSum: totalSum, 'increase': true, type: 'Все', service: service });
                    for (let key in resSumCredit) {
                        resSumCredit[key].sum = resSumCredit[key].sum.toFixed(2);
                        resSumCredit[key].percent = (resSumCredit[key].sum * 100 / totalSum).toFixed(2);
                        output.push(resSumCredit[key]);
                    }
                }
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'SecondPageSumEnterprises', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'area', type: 'number', "required": true },
                { arg: 'service', type: 'string', "required": true },
                { arg: 'id', type: 'number', "required": true }
            ],
            returns: { arg: 'SumEnterprises', type: 'string' },
            description: ('Метод возвращает суммы кредиторов по услугам')
        }
    )

    /**
     * Метод возвращает суммы кредиторов по услугам за период
     * Вторая страница
     */
    BalanceResourse.SecondPagedebtEnterprisePeriod = function (yearStart, yearEnd, area, service, idCredit, call) {

        let monthStart = moment([yearStart, 0, 1]).format();
        let monthEnd = moment([yearEnd, 11, 1, 23]).format();
        let deltaMonth = (+yearEnd - +yearStart + 1) * 12;
        new Promise((resolve, reject) => {
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
                .then(res => {
                    if (res.length > 0) {
                        resolve(res);
                    } else {
                        reject('Таких услуг не существует');
                    }
                })
        }).then(res => {
            let resSum = [];
            for (let i = 0; i < deltaMonth; i++) {
                resSum[i] = 0;
            }
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,period ' +
                'FROM ( ' +
                'SELECT -sum AS sum,period ' +
                'FROM stack.charge_resourse c ' +
                'JOIN stack.address_ref a ON c.address_id = a.id ' +
                'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) and a.district = $5 ' +
                'UNION ALL ' +
                'SELECT sum,period ' +
                'FROM stack.balance_resourse b ' +
                'JOIN stack.address_ref a ON b.address_id = a.id ' +
                'WHERE period >= $6 and period <= $7 and resource_enterprise_id = $8 and service_id = ANY ($9) and a.district = $10 ' +
                ') AS data ' +
                'GROUP BY period'
                , [monthStart, monthEnd, idCredit, res, area, monthStart, monthEnd, idCredit, res, area], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let periodYear = +data.period.getFullYear();
                let periodMonth = +data.period.getMonth();
                let indYear = (periodYear - +yearStart) * 12;
                resSum[periodMonth + +indYear] += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let output = [];
                let max = 0;
                let length = resSum.length;
                for (let ind = 0; ind < length; ind++) {
                    resSum[ind] = Number(resSum[ind].toFixed(2));
                    max = max > resSum[ind] ? max : resSum[ind];
                    output.push({ sum: resSum[ind] < 0 ? 0 : resSum[ind] });
                }
                output.unshift({ max: max.toFixed(2), service: service });
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'SecondPagedebtEnterprisePeriod', {
            accepts: [
                { arg: 'yearStart', type: 'number', "required": true },
                { arg: 'yearEnd', type: 'number', "required": true },
                { arg: 'area', type: 'number', "required": true },
                { arg: 'service', type: 'string', "required": true },
                { arg: 'id', type: 'number', "required": true }
            ],
            returns: { arg: 'debtEnterprisePeriod', type: 'string' },
            description: ('Метод возвращает суммы кредиторов по услугам за период')
        }
    )

    /**
     * Метод возвращает сумму задолженности по организациям-кредиторам
     * с указанием конкретной услуги
     * Третья страница
     */
    BalanceResourse.debtCredit = function (month, service, region, count, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayService = [];
        let arrayEnterprise = [];
        new Promise((resolve, reject) => {
            let indexFinal = 0;
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
                .then(res => {
                    if (res.length > 0) {
                        arrayService = res;
                        if (indexFinal === 1) {
                            resolve(res);
                        }
                        indexFinal = 1;
                    } else {
                        reject('Таких услуг не существует');
                    }
                })
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
        }).then(() => {
            let resSum = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream(
                'SELECT sum(sum) AS sum,resource_enterprise_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,resource_enterprise_id,address_id  ' +
                    'FROM stack.charge_resourse ' +
                    'WHERE period >= $1 and period <= $2 and service_id = ANY ($3) ' +
                    'UNION ALL ' +
                    'SELECT sum,resource_enterprise_id,address_id ' +
                    'FROM stack.balance_resourse ' +
                    'WHERE period >= $4 and period <= $5 and service_id = ANY ($6) ' +
                ') AS data ' +
                'JOIN stack.address_ref r on data.address_id = r.id ' +
                'WHERE region = $7 ' +
                'GROUP BY resource_enterprise_id'
                , [monthStart, monthEnd, arrayService, monthStart, monthEnd, arrayService,region], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let id = data.resource_enterprise_id;
                if (!resSum[id]) {
                    resSum[id] = { sum: 0, percent: 0, name: arrayEnterprise[id].short_name, id: id };
                }
                resSum[id].sum += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let sumTotal = 0;
                let increase = true;
                for (let key in resSum) {
                    if (resSum[key].sum > 0) {
                        sumTotal += +resSum[key].sum;
                    } else {
                        resSum[key].sum = 0;
                    }
                }
                let output = [];
                sumTotal = sumTotal.toFixed(2);
                for (let key in resSum) {
                    resSum[key].sum = resSum[key].sum.toFixed(2);
                    let percent = (resSum[key].sum * 100 / sumTotal).toFixed(2);
                    resSum[key].percent = +percent > 100 ? 100 : percent;
                    output.push(resSum[key]);
                }
                output.sort(function (a, b) {
                    return a.sum - b.sum;
                }).reverse();
                if (count !== undefined) {
                    let arrayTemp = output.slice(count, output.length);
                    let length = arrayTemp.length;
                    let sum = 0;
                    let percent = 0;
                    for (let index = 0; index < length; index++) {
                        sum += +arrayTemp[index].sum;
                        percent += +arrayTemp[index].percent;
                    }
                    if (sum > 0) {
                        output.splice(count, output.length);
                        output.push({ sum: sum.toFixed(2), percent: percent.toFixed(2), name: 'Остальные организации', id: 0 });
                    }
                }
                output.unshift({ 'sumTotal': sumTotal, 'increase': increase, 'sum': sumTotal });
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'debtCredit', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'service', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true },
                { arg: 'count', type: 'number', "required": false }
            ],
            returns: { arg: 'debtCredit', type: 'string' },
            description: ('сумма задолженности по организациям-кредиторам с указанием конкретной услуги')
        }
    )

    /**
     * Метод возвращает сумму задолженности по организациям-дебиторам
     * с указанием конкретной услуги
     * Третья страница
     */
    BalanceResourse.debtDebetService = function (month, service, idCredit, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayService = [];
        let arrayEnterprise = [];
        let sumTotal = 0;
        let increase = true;
        new Promise((resolve, reject) => {
            let indexFinal = 0;
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
                .then(res => {
                    if (res.length > 0) {
                        arrayService = res;
                        if (indexFinal === 1) {
                            resolve(res);
                        }
                        indexFinal = 1;
                    } else {
                        reject('Таких услуг не существует');
                    }
                })
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
        }).then(() => {
            let resSum = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,management_enterprise_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,management_enterprise_id,address_id  ' +
                    'FROM stack.charge_resourse ' +
                    'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) ' +
                    'UNION ALL ' +
                    'SELECT sum,management_enterprise_id,address_id  ' +
                    'FROM stack.balance_resourse ' +
                    'WHERE period >= $5 and period <= $6 and resource_enterprise_id = $7 and service_id = ANY ($8) ' +
                ') AS data ' +
                'JOIN stack.address_ref r on data.address_id = r.id ' +
                'WHERE region = $9 ' +
                'GROUP BY management_enterprise_id'
                , [monthStart, monthEnd, idCredit, arrayService, monthStart, monthEnd, idCredit, arrayService, region], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let id = data.management_enterprise_id;
                if (!resSum[id]) {
                    let name = +id > 0 ? arrayEnterprise[id].short_name : 'Население';
                    resSum[id] = { sum: 0, percent: 0, name: name, id: id };
                }
                resSum[id].sum += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let percent = 0;
                for (let key in resSum) {
                    if (resSum[key].sum > 0) {
                        sumTotal += +resSum[key].sum.toFixed(2);
                    }
                }
                let output = [];
                sumTotal = sumTotal.toFixed(2);
                for (let key in resSum) {
                    if (resSum[key].sum > 0) {
                        resSum[key].sum = resSum[key].sum.toFixed(2);
                        percent = (resSum[key].sum * 100 / sumTotal).toFixed(2);
                        resSum[key].percent = percent > 100 ? 100 : percent;
                        output.push(resSum[key]);
                    }
                }
                output.push({ 'sumTotal': sumTotal, 'increase': increase, sum: sumTotal });
                output.sort(function (a, b) {
                    return a.sum - b.sum;
                }).reverse();
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'debtDebetService', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'service', type: 'string', "required": true },
                { arg: 'id', type: 'number', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'debtDebetService', type: 'string' },
            description: ('Сумма задолженности')
        }
    )

    /**
     * Метод возвращает сумму задолженности по организациям-дебиторам
     * с указанием конкретной услуги и организации-кредитора
     * Третья страница
     */
    BalanceResourse.debtDebetServiceCredit = function (month, service, idCredit, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let arrayService = [];
        let arrayEnterprise = [];
        let arrayAddress = [];
        new Promise((resolve, reject) => {
            let indexFinal = 0;
            let arrayServiceTemp = service.split(',');
            accordServicesArray(arrayServiceTemp)
                .then(res => {
                    if (res.length > 0) {
                        arrayService = res;
                        if (indexFinal === 2) {
                            resolve(res);
                        }
                        indexFinal++;
                    } else {
                        reject('Таких услуг не существует');
                    }
                })
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if (indexFinal === 2) {
                    resolve(result);
                }
                indexFinal++;
            })
            let Address = loopback.findModel('Address_Ref');
            Address.find({}, function (err, result) {
                if (err !== null) {
                    reject(err.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayAddress[result[i].id] = result[i];
                }
                if (indexFinal === 2) {
                    resolve(result);
                }
                indexFinal++;
            })
        }).then(() => {
            let resSum = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream('SELECT sum(sum) AS sum,management_enterprise_id,address_id ' +
                'FROM ( ' +
                    'SELECT -sum AS sum,management_enterprise_id,address_id ' +
                    'FROM stack.charge_resourse ' +
                    'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 and service_id = ANY ($4) ' +
                    'UNION ALL ' +
                    'SELECT sum,management_enterprise_id,address_id ' +
                    'FROM stack.balance_resourse ' +
                    'WHERE period >= $5 and period <= $6 and resource_enterprise_id = $7 and service_id = ANY ($8) ' +
                ') AS data ' +
                'JOIN stack.address_ref r on data.address_id = r.id ' +
                'WHERE region = $9 ' +
                'GROUP BY management_enterprise_id,address_id'
                , [monthStart, monthEnd, idCredit, arrayService, monthStart, monthEnd, idCredit, arrayService, region], { batchSize: 100 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let id = data.management_enterprise_id === -1 ? 'n_' + data.address_id : data.management_enterprise_id;
                if (!resSum[id]) {
                    let name = data.management_enterprise_id === -1 ? arrayAddress[data.address_id].name : arrayEnterprise[data.management_enterprise_id].short_name;
                    resSum[id] = { sum: 0, name: name, id: id };
                }
                resSum[id].sum += +data.sum;
            })
            streamQuery.on('end', () => {
                client.end();
                let output = [];
                for (let key in resSum) {
                    resSum[key].sum = resSum[key].sum.toFixed(2);
                    if (resSum[key].sum > 0) {
                        output.push(resSum[key]);
                    }
                }
                output.sort(function (a, b) {
                    return a.sum - b.sum;
                }).reverse();
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'debtDebetServiceCredit', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'service', type: 'string', "required": true },
                { arg: 'id', type: 'number', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'debtDebetServiceCredit', type: 'string' },
            description: ('Сумма задолженности')
        }
    )

    /**
     * Метод возвращает сумму задолженности организаций-дебиторов
     * перед кредитором с начислениями и оплатой
     * Четвертая страница
     */
    BalanceResourse.debtDebet = function (month, idCredit, region, call) {

        let arrayMonth = month.split('-');
        let monthStart = moment([arrayMonth[0], +arrayMonth[1] - 1, 1]).format();
        let monthEnd = moment([arrayMonth[0], +arrayMonth[1] - 1, 1, 23]).format();
        let lastMonth = moment(month).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        let arraylastMonth = lastMonth.split('-');
        let lastMonthStart = moment([arraylastMonth[0], +arraylastMonth[1] - 1, 1]).format();
        let lastMonthEnd = moment([arraylastMonth[0], +arraylastMonth[1] - 1, 1, 23]).format();
        let arrayService2 = [];
        let arrayEnterprise = [];
        let electric = ServicesTypes.electric;
        let heat = ServicesTypes.heat;
        let water = ServicesTypes.water;
        let gas = ServicesTypes.gas;
        new Promise((resolve, reject) => {
            let indexFinal = 0;
            let Enterprise = loopback.findModel('Enterprise_Ref');
            Enterprise.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayEnterprise[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
            let Service = loopback.findModel('Service_Ref');
            Service.find({}, function (error, result) {
                if (error !== null) {
                    reject(error.message, {});
                    return '';
                }
                let length = result.length;
                for (let i = 0; i < length; i++) {
                    arrayService2[result[i].id] = result[i];
                }
                if (indexFinal === 1) {
                    resolve(result);
                }
                indexFinal = 1;
            })
        }).then(() => {
            let resSum = {};
            let client = new pg.Client(modelConfig);
            client.connect(function (error) {
                if (error !== null) {
                    call(error);
                    return '';
                }
            });
            let query = new QueryStream(
                'SELECT 0 AS sum,sum(sum) AS sumPay,0 AS sumBal,0 AS amount,management_enterprise_id,service_id,1 AS type ' +
                'FROM stack.payment_resourse t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $1 and period <= $2 and resource_enterprise_id = $3 AND region = $4 ' +
                'GROUP BY management_enterprise_id,service_id ' +
                'UNION ALL ' +
                'SELECT 0 AS sum,sum(sum) AS sumPay,0 AS sumBal,0 AS amount,management_enterprise_id,service_id,2 AS type ' +
                'FROM stack.payment t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $5 and period <= $6 and resource_enterprise_id = $7 AND region = $8 ' +
                'GROUP BY management_enterprise_id,service_id ' +
                'UNION ALL ' +
                'SELECT sum(sum) AS sum,0 AS sumPay,0 AS sumBal,sum(amount) AS amount,management_enterprise_id,service_id,1 AS type ' +
                'FROM stack.charge_resourse t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $9 and period <= $10 and resource_enterprise_id = $11 AND region = $12 ' +
                'GROUP BY management_enterprise_id,service_id ' +
                'UNION ALL ' +
                'SELECT sum(sum)+sum(recalculate)-sum(quality) AS sum,0 AS sumPay,0 AS sumBal,sum(amount) AS amount,management_enterprise_id,service_id,2 AS type ' +
                'FROM stack.charge t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $13 and period <= $14 and resource_enterprise_id = $15 AND region = $16 ' +
                'GROUP BY management_enterprise_id,service_id ' +
                'UNION ALL ' +
                'SELECT 0 AS sum,0 AS sumPay,sum(sum) AS sumBal,0 AS amount,management_enterprise_id,service_id,1 AS type ' +
                'FROM stack.balance_resourse t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $17 and period <= $18 and resource_enterprise_id = $19 AND region = $20 ' +
                'GROUP BY management_enterprise_id,service_id ' +
                'UNION ALL ' +
                'SELECT 0 AS sum,0 AS sumPay,sum(sum) AS sumBal,0 AS amount,management_enterprise_id,service_id,2 AS type ' +
                'FROM stack.balance_resourse t ' +
                'JOIN stack.address_ref r on t.address_id = r.id ' +
                'WHERE period >= $21 and period <= $22 and resource_enterprise_id = $23 AND region = $24 ' +
                'GROUP BY management_enterprise_id,service_id '
                , [monthStart, monthEnd, idCredit, region, monthStart, monthEnd, idCredit, region, monthStart, monthEnd, idCredit, region, monthStart, monthEnd, idCredit
                    , region, monthStart, monthEnd, idCredit, region, lastMonthStart, lastMonthEnd, idCredit, region], { batchSize: 1000 });
            let streamQuery = client.query(query);
            streamQuery.on('data', (data) => {
                let idEnterprise = data.management_enterprise_id;
                let idService = data.service_id;
                if (!resSum[idEnterprise]) {
                    resSum[idEnterprise] = {
                        amount: 0, amountDebet: 0, sumCharge: 0, sumChargeDebet: 0, sumPayment: 0, sumPaymentDebet: 0, lastBalance: 0, sumBalance: 0, increase: true, name: "", unit: ''
                    };
                }
                if (data.type === 1) {
                    resSum[idEnterprise].sumCharge += +data.sum;
                    resSum[idEnterprise].amount += +data.amount;
                    resSum[idEnterprise].sumPayment += +data.sumpay;
                    resSum[idEnterprise].sumBalance += +data.sumbal;
                } else {
                    resSum[idEnterprise].sumChargeDebet += +data.sum;
                    resSum[idEnterprise].amountDebet += +data.amount;
                    resSum[idEnterprise].sumPaymentDebet += +data.sumpay;
                    resSum[idEnterprise].lastBalance += +data.sumbal;
                }
                if (accordServicesTrue(arrayService2[idService].code, electric) === true) {
                    if (!resSum[idEnterprise][electric]) {
                        resSum[idEnterprise][electric] = { amount: 0, amountDebet: 0, sumCharge: 0, sumChargeDebet: 0, sumPayment: 0, sumPaymentDebet: 0, lastBalance: 0, sumBalance: 0, increase: true, name: "", unit: ServicesUnit.electric };
                    }
                    if (data.type === 1) {
                        resSum[idEnterprise][electric].sumCharge += +data.sum;
                        resSum[idEnterprise][electric].amount += +data.amount;
                        resSum[idEnterprise][electric].sumPayment += +data.sumpay;
                        resSum[idEnterprise][electric].sumBalance += +data.sumbal;
                    } else {
                        resSum[idEnterprise][electric].sumChargeDebet += +data.sum;
                        resSum[idEnterprise][electric].amountDebet += +data.amount;
                        resSum[idEnterprise][electric].sumPaymentDebet += +data.sumpay;
                        resSum[idEnterprise][electric].lastBalance += +data.sumbal;
                    }
                } else if (accordServicesTrue(arrayService2[idService].code, heat) === true) {
                    if (!resSum[idEnterprise][heat]) {
                        resSum[idEnterprise][heat] = { amount: 0, amountDebet: 0, sumCharge: 0, sumChargeDebet: 0, sumPayment: 0, sumPaymentDebet: 0, lastBalance: 0, sumBalance: 0, increase: true, name: "", unit: ServicesUnit.heat };
                    }
                    if (data.type === 1) {
                        resSum[idEnterprise][heat].sumCharge += +data.sum;
                        resSum[idEnterprise][heat].amount += +data.amount;
                        resSum[idEnterprise][heat].sumPayment += +data.sumpay;
                        resSum[idEnterprise][heat].sumBalance += +data.sumbal;
                    } else {
                        resSum[idEnterprise][heat].sumChargeDebet += +data.sum;
                        resSum[idEnterprise][heat].amountDebet += +data.amount;
                        resSum[idEnterprise][heat].sumPaymentDebet += +data.sumpay;
                        resSum[idEnterprise][heat].lastBalance += +data.sumbal;
                    }
                } else if (accordServicesTrue(arrayService2[idService].code, water) === true) {
                    if (!resSum[idEnterprise][water]) {
                        resSum[idEnterprise][water] = { amount: 0, amountDebet: 0, sumCharge: 0, sumChargeDebet: 0, sumPayment: 0, sumPaymentDebet: 0, lastBalance: 0, sumBalance: 0, increase: true, name: "", unit: ServicesUnit.heat };
                    }
                    if (data.type === 1) {
                        resSum[idEnterprise][water].sumCharge += +data.sum;
                        resSum[idEnterprise][water].amount += +data.amount;
                        resSum[idEnterprise][water].sumPayment += +data.sumpay;
                        resSum[idEnterprise][water].sumBalance += +data.sumbal;
                    } else {
                        resSum[idEnterprise][water].sumChargeDebet += +data.sum;
                        resSum[idEnterprise][water].amountDebet += +data.amount;
                        resSum[idEnterprise][water].sumPaymentDebet += +data.sumpay;
                        resSum[idEnterprise][water].lastBalance += +data.sumbal;
                    }
                } else if (accordServicesTrue(arrayService2[idService].code, gas) === true) {
                    if (!resSum[idEnterprise][gas]) {
                        resSum[idEnterprise][gas] = { amount: 0, amountDebet: 0, sumCharge: 0, sumChargeDebet: 0, sumPayment: 0, sumPaymentDebet: 0, lastBalance: 0, sumBalance: 0, increase: true, name: "", unit: ServicesUnit.gas };
                    }
                    if (data.type === 1) {
                        resSum[idEnterprise][gas].sumCharge += +data.sum;
                        resSum[idEnterprise][gas].amount += +data.amount;
                        resSum[idEnterprise][gas].sumPayment += +data.sumpay;
                        resSum[idEnterprise][gas].sumBalance += +data.sumbal;
                    } else {
                        resSum[idEnterprise][gas].sumChargeDebet += +data.sum;
                        resSum[idEnterprise][gas].amountDebet += +data.amount;
                        resSum[idEnterprise][gas].sumPaymentDebet += +data.sumpay;
                        resSum[idEnterprise][gas].lastBalance += +data.sumbal;
                    }
                }
            })
            streamQuery.on('end', () => {
                client.end();
                let output = [];
                for (let key in resSum) {
                    let outputin = [];
                    let count = 0;
                    let unit = '';
                    for (let keyin in resSum[key]) {
                        if (typeof (resSum[key][keyin]) === 'object') {
                            count++;
                            if (resSum[key][keyin].sumBalance - resSum[key].lastBalance <= 0) {
                                resSum[key][keyin].increase = false;
                            }
                            resSum[key][keyin].name = keyin;
                            resSum[key][keyin].sumCharge = resSum[key][keyin].sumCharge.toFixed(2) + ' / ' + resSum[key][keyin].amount.toFixed(5) + ' ' + resSum[key][keyin].unit;
                            resSum[key][keyin].sumChargeDebet = resSum[key][keyin].sumChargeDebet.toFixed(2) + ' / ' + resSum[key][keyin].amountDebet.toFixed(5) + ' ' + resSum[key][keyin].unit;
                            resSum[key][keyin].sumPayment = resSum[key][keyin].sumPayment.toFixed(2);
                            resSum[key][keyin].sumPaymentDebet = resSum[key][keyin].sumPaymentDebet.toFixed(2);
                            resSum[key][keyin].lastBalance = resSum[key][keyin].lastBalance.toFixed(2);
                            resSum[key][keyin].sumBalance = resSum[key][keyin].sumBalance.toFixed(2);
                            Object.assign(resSum[key][keyin], { id: key > 0 ? key : idCredit, service: keyin });
                            outputin.push(resSum[key][keyin]);
                            unit = resSum[key][keyin].unit;
                            delete (resSum[key][keyin]);
                        }
                    }
                    if (resSum[key].sumBalance - resSum[key].lastBalance > 0) {
                        resSum[key].increase = false;
                    }
                    resSum[key].name = key > 0 ? arrayEnterprise[key].short_name : 'Население';
                    resSum[key].sumCharge = count > 1 ? resSum[key].sumCharge.toFixed(2) : resSum[key].sumCharge.toFixed(2) + ' / ' + resSum[key].amount.toFixed(5) + ' ' + unit;
                    resSum[key].sumChargeDebet = count > 1 ? resSum[key].sumChargeDebet.toFixed(2) : resSum[key].sumChargeDebet.toFixed(2) + ' / ' + resSum[key].amountDebet.toFixed(5) + ' ' + unit;
                    resSum[key].sumPayment = resSum[key].sumPayment.toFixed(2);
                    resSum[key].sumPaymentDebet = resSum[key].sumPaymentDebet.toFixed(2);
                    resSum[key].lastBalance = resSum[key].lastBalance.toFixed(2);
                    resSum[key].sumBalance = resSum[key].sumBalance.toFixed(2);
                    Object.assign(resSum[key], { id: key > 0 ? key : idCredit });
                    output.push(resSum[key]);
                    if (count > 1) {
                        let arrayTemp = output[output.length - 1];
                        Object.assign(arrayTemp, outputin);
                    }
                }
                call(null, output);
            })
            streamQuery.on('error', (error) => {
                client.end();
                call(error);
            })
        }, rej => {
            call(rej);
        })
    }

    /**
     * параметры вызова метода
     * месяц передается в формате yyyy-mm-dd
     */
    BalanceResourse.remoteMethod(
        'debtDebet', {
            accepts: [
                { arg: 'month', type: 'string', "required": true },
                { arg: 'id', type: 'string', "required": true },
                { arg: 'region', type: 'number', "required": true }
            ],
            returns: { arg: 'headerSum', type: 'string' },
            description: ('Общая сумма задолженности')
        }
    )

    /**
     * Генерация новых данных
     * @param {*} call 
     */
    BalanceResourse.GenerateData = function (call) {

        let monthStart = moment([2016, 0, 1]).format('YYYY-MM-DD');
        let monthEnd = moment([2016, 11, 1]).format('YYYY-MM-DD');
        BalanceResourse.find({
            'where': {
                period: { between: [monthStart, monthEnd] }
            }
        }
            , function (err, result) {
                if (err !== null) {
                    call(err.message, {});
                    return '';
                }
                let length = result.length;
                let dataBalance = {};
                let indData = 0;
                let coef = 0;
                for (let index = 0; index < length; index++) {
                    let periodMonth = +result[index].period.getMonth();
                    for (let ind = 2013; ind < 2018; ind++) {
                        if (ind !== 2016) {
                            let currentMonth = moment([ind, periodMonth, 1]).format('YYYY-MM-DD');
                            dataBalance[indData] = JSON.parse(JSON.stringify(result[index]));
                            dataBalance[indData].period = currentMonth;
                            coef = (4.5 + Math.random() * 6) / 100;
                            if (index % 2 === 0) {
                                if (ind % 2 !== 0) {
                                    dataBalance[indData].sum = (+result[index].sum - +result[index].sum * coef).toFixed(2);
                                } else {
                                    dataBalance[indData].sum = (+result[index].sum + +result[index].sum * coef).toFixed(2);
                                }
                            } else {
                                if (ind % 2 !== 0) {
                                    dataBalance[indData].sum = (+result[index].sum + +result[index].sum * coef).toFixed(2);
                                } else {
                                    dataBalance[indData].sum = (+result[index].sum - +result[index].sum * coef).toFixed(2);
                                }
                            }
                            delete (dataBalance[indData].id);
                            indData++;
                        }
                    }
                }
                let data = [];
                for (let key in dataBalance) {
                    data.push(dataBalance[key]);
                }
                BalanceResourse.create(data, {}, function (req, res) {
                    if (req !== null) {
                        let err = new Error(req[0].message);
                        call(err);
                        return '';
                    }
                    call(null, 'Сделано');
                });
            })

    }

    /**
     * параметры вызова метода
     */
    BalanceResourse.remoteMethod(
        'GenerateData', {
            returns: { arg: 'GenerateData', type: 'string' },
            description: ('Генерация данных')
        }
    )
};