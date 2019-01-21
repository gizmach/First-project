"use strict";
const importCharge = require("../helpers/import/importCharge");
const importChargeResourse = require("../helpers/import/importChargeResourse");
const importPayment = require("../helpers/import/importPayment");
const importPaymentResourse = require("../helpers/import/importPaymentResourse");
const importBalance = require("../helpers/import/importBalance");
const importBalanceResourse = require("../helpers/import/importBalanceResourse");
const importServices = require("../helpers/import/importServices");
const importEnterprises = require("../helpers/import/importEnterprises");

module.exports = function(file) {
    /**
     * Метод подкачки данных
     */
    file.upload = function(name, call) {
        let arrayFile = name.split("_");
        let url = "assets/reports/"+name;
        switch (arrayFile[0]) {
        case "Nachisl":
            importCharge(url);
            call(null, "подкачалось");
            break;
        case "NachislRes":
            importChargeResourse(url);
            call(null, "подкачалось");
            break;
        case "Oplat":
            importPayment(url);
            call(null, "подкачалось");
            break;
        case "OplatRes":
            importPaymentResourse(url);
            call(null, "подкачалось");
            break;
        case "Saldo":
            importBalance(url);
            call(null, "подкачалось");
            break;
        case "SaldoRes":
            importBalanceResourse(url);
            call(null, "подкачалось");
            break;
        case "Usl":
            importServices(url);
            call(null, "подкачалось");
            break;
        case "Org":
            importEnterprises(url);
            call(null, "подкачалось");
            break;
        default:
            call(null, "имя файла некорректно");
        }
    };

    /**
     * параметры вызова метода
     */
    file.remoteMethod("upload", {
        accepts: { arg: "name", type: "string", required: true },
        returns: { arg: "Итог", type: "string" },
        description: "Подкачка из файла в таблицы"
    });
};
