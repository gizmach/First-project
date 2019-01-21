'use strict';
const importEnterprises = require("../helpers/import/importEnterprises");
const modelConfig = require('../../server/datasources.json').stackPostgreDb;
const pg = require('pg');
const QueryStream = require('pg-query-stream');
const moment = require('moment');
const accordServicesArray = require('../helpers/accords/accordServicesArray');

module.exports = function(enterprise) {

    /**
     * описание метода
     */
    enterprise.insertData = function(url,call) {
        importEnterprises(url);
        call(null,"что то подкачалось");
    }

    /**
     * параметры вызова метода
     */
    enterprise.remoteMethod(
        'insertData', {
            accepts: {arg: 'path', type: 'string',"required": true},
            returns: {arg: 'Итог', type: 'string'},
            description: ('Подкачка из файла в таблицу Enterprise_ref')
        }
    )

    /**
     * Метод возвращает поля организаций
     * Четвертая и пятая страница
     */
    enterprise.enterpriseInfo = function(numberId,call) {
        enterprise.find({
            'where':{id:numberId}
        }
        ,function(err, result) {
            call(err,result)
        })
    }
    
    /**
     * параметры вызова метода
     */
    enterprise.remoteMethod(
        'enterpriseInfo', {
            accepts: {arg: 'id', type: 'number',"required": true},
            returns: {arg: 'Enterprise', type: 'string'},
            description: ('Для карточки организации')
        }
    )

    /**
     * Метод возвращает список УК в регионе
     * Мониторинг
     */
    enterprise.enterpriseList = function(year,service,region,call) {

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

            let client = new pg.Client(modelConfig);
            client.connect(function(error) {
                if( error !== null ) {
                    call(error);
                    return '';
                }
            });
            let output = [];
            let query = new QueryStream(
                'SELECT distinct management_enterprise_id,r.short_name '+
                'FROM ( '+
                    'SELECT management_enterprise_id '+
                    'FROM stack.charge '+
                    'JOIN stack.address_ref a ON address_id = a.id ' + 
                    'WHERE period >= $1 and period <= $2 and region = $3 and service_id = ANY ($4) '+
                    'GROUP BY management_enterprise_id ' +
                    'UNION ALL '+
                    'SELECT management_enterprise_id '+
                    'FROM stack.balance '+
                    'JOIN stack.address_ref a ON address_id = a.id ' + 
                    'WHERE period >= $5 and period <= $6 and region = $7 and service_id = ANY ($8) '+
                    'GROUP BY management_enterprise_id ' +
                ') AS data '+
                'LEFT JOIN stack.enterprise_ref r on data.management_enterprise_id = r.id '
            ,[monthStart,monthEnd,region,res,monthStart,monthEnd,region,res],{batchSize:100});
            let streamQuery = client.query(query);
            streamQuery.on('data',(data) => {
                output.push({"value":data.management_enterprise_id,"text":data.short_name = data.management_enterprise_id === -1 ? 'Население' : data.short_name});
            })
            streamQuery.on('end', () => {
                client.end();
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
    enterprise.remoteMethod(
        'enterpriseList', {
            accepts: [
                {arg: 'year', type: 'number',"required": true},
                {arg: 'service', type: 'string',"required": true},
                {arg: 'region', type: 'number',"required": true}
            ],
            returns: {arg: 'EnterpriseList', type: 'string'},
            description: ('Дсписок УК в регионе')
        }
    )
};