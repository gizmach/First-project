const TransformServices = require('../common/helpers/import/transformServices');
const TransformEnterprises = require('../common/helpers/import/transformEnterprises');
const ClassRead = require('./readStr');
var {assert} = require('chai');

          
describe("Тест Transform в JSON", function() {
    it("Тест Transform услуг", function(done) {
        const input = `Вывоз ТБО с площади кв, м;Вывоз ТБО;м2;901
        ГВС: начисление по счетчику;ГВС: начисление по счетчику;м3;651
        Стоки ХВ: начисление по инд.счетчику;Стоки ХВ: начисление по инд.счетчику;м3;751;
        Отопление: по нормативу: Отопл. центр.система;Отопление: по нормативу: Отопл. центр.система;Гкал;401
        Стоки ГВ: начисление по инд.счетчику;Стоки ГВ: начисление по инд.счетчику;м3;851`;
        let testData = [{
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
        let classRead = new ClassRead(input);
        let transform = new TransformServices();
        let trasformedData = [];
        let dataRead = []; 
        classRead.on('readable', () => {})
        classRead.pipe(transform)
        transform.on('data',(data)=> {
            trasformedData.push(data);
        })
        transform.on('finish',()=>{
           try {
                assert.deepEqual(trasformedData,testData);
                done();
            }
            catch(error) {
                done(error);
            }
        })
    });
    it("Тест Transform организаций", function(done) {
        const input = `АО "ИВЦ ЖКХ и ТЭК";ИВЦ ЖКХ и ТЭК;3445061691;344501001;400120, г.Волгоград, ул.Череповецкая, 11/4;;;;;;
        1-й участок                     ;1-й участок                     ;;;;;;;;;
        МУП "Волгоградское коммунальное хозяйство" Ворош.рн;МУП "Волгоградское коммунальное хозяйство" Ворош.рн;3448004130;345250001;400131, г. Волгоград, ул. Порт-Саида, д. 16А;400131, г. Волгоград, ул. Порт-Саида, д. 16А;(8442) 26-47-15, 94-84-71;;vkh-vlg.ru;v
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
        let classRead = new ClassRead(input);
        let transform = new TransformEnterprises();
        let trasformedData = [];
        let dataRead = []; 
        classRead.on('readable', () => {})
        classRead.pipe(transform)
        transform.on('data',(data)=> {
            trasformedData.push(data);
        })
        transform.on('finish',()=>{
           try {
                assert.deepEqual(trasformedData,testData);
                done();
            }
            catch(error) {
                done(error);
            }
        })
    });
});