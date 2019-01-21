const serviceProperties = require('./accordProperties');
const ServicesTypes = serviceProperties.ServicesTypes;
const ServicesCodes = serviceProperties.ServicesCodes;

/**
 * Возвращает true или false
 * @param {*} input 
 */
let accordServicesTrue = function(code,name) {

    let delta = code - code%100;
    if( delta > 0 ) {
        if( name === ServicesTypes.electric && ServicesCodes.electric.indexOf(delta) >= 0 ) {
            return true;
        } else if( name === ServicesTypes.heat && ServicesCodes.heat.indexOf(delta) >= 0 ) {
            return true;
        } else if( name === ServicesTypes.water && ServicesCodes.water.indexOf(delta) >= 0 ) {
            return true;
        } else if( name === ServicesTypes.gas && ServicesCodes.gas.indexOf(delta) >= 0 ) {
            return true;
        }
    }
    return false;
}

module.exports = accordServicesTrue;