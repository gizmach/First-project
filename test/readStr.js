const {Readable}  = require('stream');

/**
 * Читает данные и передает в буффер массив построчно
 */
 class ClassRead extends Readable {
     /**
      * Переопределяет входные данные в строку 
      * и разбивает на массив по переносу строки
      * @param {*} string 
      * @param {*} options 
      */
    constructor( string = "", options = {} ) {
        options.encoding = 'UTF8';
        super(options);
        this.data = string.split(/\n/);
    }

    /**
     * Перебирает массив и отправляет в буффер,
     * по окончании массива прерывает null 
     */
    _read() {
        this.push(this.data.pop()||null); 
    }
}
module.exports = ClassRead;