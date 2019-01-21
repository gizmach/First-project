const ClassRead = require('./readStr');
var {assert} = require('chai');

          
describe("Тест входных данных", function() {
    describe("Данные услуг", function() {
        beforeEach(function() {
            const input = `Вывоз ТБО с площади кв, м;Вывоз ТБО;м2;901
            ГВС: начисление по счетечику;ГВС: начисление по счетчику;м3;651
            Стоки ХВ: начисление по инд.счетчику;Стоки ХВ: начисление по инд.счетчику;м3;751
            Отопление: по нормативу: Отопл. центр.система;Отопление: по нормативу: Отопл. центр.система;Гкал;401
            Стоки ГВ: начисление по инд.счетчику;Стоки ГВ: начисление по инд.счетчику;м3;851`;
            const testData = [{
                full_name:'Вывоз ТБО с площади кв, м',
                short_name:'Вывоз ТБО',
                units:'м2',
                code:'901'
            },{
                full_name:'ГВС: начисление по счетчику',
                short_name:'ГВС: начисление по счетчику',
                units:'м3',
                code:'651'
            },{
                full_name:'Стоки ХВ: начисление по инд.счетчику',
                short_name:'Стоки ХВ: начисление по инд.счетчику',
                units:'м3',
                code:'751'
            },{
                full_name:'Отопление: по нормативу: Отопл. центр.система',
                short_name:'Отопление: по нормативу: Отопл. центр.система',
                units:'Гкал',
                code:'401'
            },{
                full_name:'Стоки ГВ: начисление по инд.счетчику',
                short_name:'Стоки ГВ: начисление по инд.счетчику',
                units:'м3',
                code:'851'
            }].reverse();
            classRead = new ClassRead(input);
            dataRead = []; 
            let i = 0;
            classRead.on('readable', () => {})
            classRead.on('data', (data) => {
                dataRead[i++] = data.split(';');
            })
            index = 0;
        })
        it("Кол-во элементов строки", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let data = dataRead[index]
                    assert.lengthOf(data,4);
                }
                done();
            })
        })
        it("Строковые данные не являются числом", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let indexData = 0;
                    for(indexData; indexData < dataRead[index].length; ++indexData) {
                        if( indexData < 3) {
                            let stringValueNumber = Number(dataRead[index][indexData]);
                            assert.isNaN(stringValueNumber,'строка');
                        } 
                    }
                }
                done();
            })
        })
        it("Строковые данные заполнены", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let indexData = 0;
                    for(indexData; indexData < dataRead[index].length; ++indexData) {
                        if( indexData < 3) {
                            let stringValueLength = dataRead[index][indexData].length;
                            assert.notEqual(stringValueLength,0);
                        } 
                    }
                }
                done();
            })
        })
        it("Номер услуги корректный", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let indexData = 0;
                    for(indexData; indexData < dataRead[index].length; ++indexData) {
                        if( indexData === 3) {
                            let code = Number(dataRead[index][indexData]);
                            assert.isAbove(code,0);
                        }
                    }
                }
                done();
            })
        })
    })
    describe("Данные организаций",function(){
        beforeEach(function() {
            const input = `АО "ИВЦ ЖКХ и ТЭК";ИВЦ ЖКХ и ТЭК;3445061691;344501001;400120, г.Волгоград, ул.Череповецкая, 11/4;;;;;;
            1-й участок                     ;1-й участок                     ;;;;;;;;;
            МУП "Волгоградское коммунальное хозяйство" Ворош.рн;МУП "Волгоградское коммунальное хозяйство" Ворош.рн;3448004130;345250001;400131, г. Волгоград, ул. Порт-Саида, д. 16А;400131, г. Волгоград, ул. Порт-Саида, д. 16А;(8442) 26-47-15, 94-84-71;;vkh-vlg.ru;v;
            ООО "УК Поскомхоз" (2015);ООО "УК Поскомхоз" (2015);3446024276;344601001;400065, г.Волгоград, пр.Ленина, д.189;400065, г.Волгоград, пр.Ленина, д.189;71-55-51, Аварийная и диспетчерская служба 8-904-771-64-09;;rodnoygorod34@yandex.ru;;`;
            let testData = [{
                full_name:'АО "ИВЦ ЖКХ и ТЭК"',
                short_name:'ИВЦ ЖКХ и ТЭК',
                itn:'3445061691',
                iec:'344501001',
                registered_office_address_id:'400120, г.Волгоград, ул.Череповецкая, 11/4',
                legal_address_address_id:'',
                phones:'',
                okpo:'',
                mail:'',
                website:'',
                fax:''
            },{
                full_name:'1-й участок',
                short_name:'1-й участок',
                itn:'',
                iec:'',
                registered_office_address_id:'',
                legal_address_address_id:'',
                phones:'',
                okpo:'',
                mail:'',
                website:'',
                fax:''
            },{
                full_name:'МУП "Волгоградское коммунальное хозяйство" Ворош.рн',
                short_name:'МУП "Волгоградское коммунальное хозяйство" Ворош.рн',
                itn:'3448004130',
                iec:'345250001',
                registered_office_address_id:'400131, г. Волгоград, ул. Порт-Саида, д. 16А',
                legal_address_address_id:'400131, г. Волгоград, ул. Порт-Саида, д. 16А',
                phones:'(8442) 26-47-15, 94-84-71',
                okpo:'',
                mail:'vkh-vlg.ru',
                website:'v',
                fax:''
            },{
                full_name:'ООО "УК Поскомхоз" (2015)',
                short_name:'ООО "УК Поскомхоз" (2015)',
                itn:'3446024276',
                iec:'344601001',
                registered_office_address_id:'400065, г.Волгоград, пр.Ленина, д.189',
                legal_address_address_id:'400065, г.Волгоград, пр.Ленина, д.189',
                phones:'71-55-51, Аварийная и диспетчерская служба 8-904-771-64-09',
                okpo:'',
                mail:'rodnoygorod34@yandex.ru',
                website:'',
                fax:''
            }].reverse();
            classRead = new ClassRead(input);
            dataRead = []; 
            let i = 0;
            classRead.on('readable', () => {})
            classRead.on('data', (data) => {
                dataRead[i++] = data.split(';');
            })
            index = 0;
        })
        it("Кол-во элементов строки", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let data = dataRead[index]
                    assert.lengthOf(data,11);
                }
                done();
            })
        })
        it("Строковые данные не являются числом", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let stringValueNumber = Number(dataRead[index][0]);
                    assert.isNaN(stringValueNumber,'строка',"Строковые данные не являются числом");
                }
                done();
            })
        })
        it("Строковые данные заполнены", function(done) {
            classRead.on('end', () => {
                for(index; index < dataRead.length; ++index) {
                    let stringValueLength = dataRead[index][0].length;
                    assert.notEqual(stringValueLength,0,"Строковые данные заполнены");
                }
                done();
            })
        })
    })
});