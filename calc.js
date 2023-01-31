/*** РАСЧЕТ ДЕРЕВЯННОЙ БАЛКИ ПЕРЕКРЫТИЯ ***/

var err = require('./../../cErrors.js');
var warn = require('./../../cWarnings.js');
var abstractCalc = require('./../../cCalc.js');

//var utils = require('./../../cUtils.js');
//var conv = require('./../../cConvertor.js');
//
//// Подключим расширения для работы с массивами
//var arr = require('./../../cArrExt.js');

exports.Calc = Calc;

// Список допустимых высот балки в зависимости от типа балки
const availableH = {
	Rb: [64, 89, 100, 120, 150, 160, 200, 220, 240, 250, 260, 300, 360, 400, 420, 450, 500, 600, 1250],
	Rs: [64, 89, 100, 120, 150, 160, 200, 220, 240, 250, 260, 300, 360, 400, 420, 450, 500, 600, 1250],
	R: [64, 89, 100, 120, 150, 160, 200, 220, 240, 250, 260, 300, 360, 400, 420, 450, 500, 600, 1250],
	X: [64, 89, 100, 120, 150, 160, 200, 220, 240, 250, 260, 300, 360, 400, 420, 450, 500, 600, 1250],
	I: [64, 89, 100, 120, 150, 160, 200, 220, 240, 250, 260, 300, 360, 400, 420, 450, 500, 600, 1250]
}

// Список допустимых ширин балки в зависимости от типа балки
const availableB = {
	Rb: [27, 30, 33, 36, 39, 45, 51, 63, 75, 90],
	Rs: [27, 30, 33, 36, 39, 45, 51, 63, 75, 90],
	R: [27, 30, 33, 36, 39, 45, 51, 63, 75, 90],
	X: [27, 30, 33, 36, 39, 45, 51],
	I: [27, 30, 33, 36, 39, 45, 51, 63, 75]
}

const g = 9.81; // [м/с2] - ускорение свободного падения

const modelBeamTypeList = {
	0: 'Rb',
	1: 'Rs',
	2: 'R',
	3: 'X',
	4: 'I'
};

function Calc(sizes){
	// Переданные размеры
	this.sizes = sizes;

	// Поля калькулятора
	this.model = {

		// Параметры отображения
		display: {
			units: {
				l: 'DU',
				t: 'select',
				v: 0,
				o: ['mm', 'cm', 'm', 'inch', 'ft']
			},
			color: {
				l: 'CL',
				t: 'select',
				v: 1,
				o: ['mono', 'paint']
			}
		},


		// Вариант расчета
		calculationVariant: {

			// Расчет сечения балки при заданном шаге между балками
			knownStep: {
				l: 'VST',
				t: 'radio',
				v: 1
			},

			// Расчет шага балки при заданном сечении балки
			knownSection: {
				l: 'VSE',
				t: 'radio',
				v: 0
			}
		},


		// Расчет для calculationVariant = 'knownSection' когда известна ширина или парамтеры сечения балки
		knownSectionData: {

			// Известна ширина балки
			width: {
				l: 'WID',
				t: 'radio',
				v: 1
			},

			// Известно соотношение высоты балки к ширине
			ratio: {
				l: 'RAT',
				t: 'radio',
				v: 0
			}
		},



		// Характеристики балки
		beamCharacteristics: {

			// Длина
			beamLength: {
				l: 'BLN',
				t: 'input',
				u: 'm',
				v: 5.4,
				min: 0.1
			},

			// Ширина
			beamWidth: {
				l: 'W',
				t: 'input',
				u: 'mm',
				v: 80,
				min: 27,
				max: 90
			},

			// Высота
			beamHeight: {
				l: 'H',
				t: 'input',
				u: 'mm',
				v: 210,
				min: 1,
				max: 1500
			},

			// Соотношение высоты к ширине
			beamRatio: {
				l: 'R',
				t: 'input',
				u: '',
				v: 1.4,
				min: 0.1
			},

			// Вид балкт
			beamType: {
				l: 'BTY',
				t: 'select',
				v: 0,
				o: modelBeamTypeList
			},

			// Пропитка
			woodenImpregnation: {
				l: 'IMP',
				t: 'select',
				v: 0,
				o: {
					0: 'no',
					1: 'yes'
				}
			}
		},

		// Конфигурация перекрытия
		floorConfiguration: {

			// Длина стены дома, вдоль которой укладываются балки
			wallLength: {
				l: 'WLN',
				t: 'input',
				u: 'm',
				v: 10,
				min: 0.5
			},

			// Шаг между балкам
			beamsStep: {
				l: 'STP',
				t: 'input',
				u: 'cm',
				v: 60,
				min: 1
			},

			// Длина пролета (расстояние между опорами балки)
			beamFullLength: {
				l: 'BFL',
				t: 'input',
				u: 'm',
				v: 6,
				min: 0.1
			},

			// Нагрузка действующая на балку (нормативная) [кг/м2]:
			// 200 кг/м2 - чердачное перекрытие,
			// 400 кг/м2 - перекрытия жилых зданий,
			// ххх - может быть установлено свео значение
			normativeLoad: {
				l: 'NLD',
				t: 'input',
				u: 'kg/m2', // [кг/м2]
				v: 400,
				min: 10
			},

			// Предельные прогибы в долях пролета СНиП II-25-80 (СП 64.13330.2011) https://yadi.sk/i/omlr9jEdSvASnA
			limitingDeflections: {
				l: 'LID',
				t: 'select',
				v: 0,
				o: {
					0: 'concreteFloor', // Перекрытия при наличии штукатурки
					1: 'floor',         // Балки междуэтажных перекрытий
					2: 'attic'          // Балки чердачных перекрытий
				}
			}
		},


		// Условия эксплуатации балки
		conditionOfUse: {

			// Срок службы, согласно СНиП II-25-80 (СП 64.13330.2011): 1) до 50 лет (1.0); 2) 50-100 лет (0.9); 3) более 100 лет (0.8)
			lifeTime: {
				l: 'LFT',
				t: 'select',
				v: 0,
				o: {
					0: 'lt50',	    // до 50 лет
					1: '50to100',	// 50-100 лет
					2: 'gt100'      // более 100 лет
				}
			},

			// Температурный режим эксплуатации: 1) до 35 град (1.0); 2) 35-40 град (0.95); 3) 45-50 град (0.85); 4) более 50 град (0.8)
			temperature: {
				l: 'TMP',
				t: 'select',
				v: 0,
				o: {
					0: 'lt35',	    // до 35 градусов
					1: '35to40',	// 35-40 градусов
					2: '40to50',    // 45-50 градусов
					3: 'gt50'       // более 50 градусов
				}
			},

			// Эксплуатационная влажность древесины/Максимальная влажность воздуха при температуре 20 °С
			woodMoistureLevel: {
				l: 'WML',
				t: 'select',
				v: 0,
				o: {
					0: 'lt12',				// до 12%/до 65%
					1: 'lt15',				// до 15%/до 75%
					2: 'lt20',				// до 20%/до 85%
					3: 'gt20'				// более 20%/более 85%
				}
			},

			// Вести расчет для конструкций, в которых напряжения в элементах, возникающие от постоянных и временных длительных нагрузок,
			// превышают 80% суммарного напряжения от всех нагрузок согласно СП 64.13330.2011 Деревянные конструкции. Актуализированная редакция СНиП II-25-80 п.5.2 (в)
			loadsCoeffMd: {
				l: 'MDC',
				t: 'select',
				v: 0,
				o: {
					0: 'no',
					1: 'yes'
				}
			}
		},

		// Стоимость леса
		materialsCost: {

			// Цена за 1м3
			pricePerCube: {
				l: 'PPC',
				t: 'input',
				u: 'rub',
				v: 7000,
				min: 0
			}
		}
	};


	// Группы полей, которые будут использоваться для отображения в качестве исходных данных
	this.srcGroups = [];

	abstractCalc.cCalc.apply(this, arguments);
}





// Унаследуем методы класса cCalc.js
Calc.prototype = Object.create(abstractCalc.cCalc.prototype);
Calc.prototype.constructor = Calc;



Calc.prototype.getResult = function(){
	/**
	 * Производит расчет
	 *
	 */

	var ret = {};

	/*** ОШИБКА: Если в калькулятор были введены некорректные данные прервем расчет и веренем ошибку **/
	if(Object.keys(this.errors).length > 0){
		ret.errors = this.errors;
		return ret;
	}


	// Проведем расчет согласно данным в моделе калькулятора (в указанных единицах измерения)
	var m = this.getModel();


	// TODO: проверки
	/*** ОШИБКА: Длина балки должна быть больше длины пролета, иначе балки будет не на что опираться ***/
	if(m.floorConfiguration.beamFullLength.v <= m.beamCharacteristics.beamLength.v){
		if(typeof ret.errors == 'undefined') ret.errors = {};
		ret.errors.floorConfiguration = ret.errors.floorConfiguration || {};
		ret.errors.floorConfiguration.beamFullLength = err.mustGreaterThan( m.beamCharacteristics.beamLength.l );

		return ret;
	}





	/** Расчет деревянных балок перекрытия **/
	// Деревянную балку перекрытия можно рассматривать как балку на двух шарнирных опорах,
	// в этом случае расчетная модель балки будет выглядеть так: https://yadi.sk/i/ZqSWlp-iFZxkig


	/********* Входные данные (переопределим переменные, чтобы привести названия к привычным "буквам" сопромата *********/
	// Нагрузка действующая на балку (нормативная) [кг/м2]:
	// 400 кг/м2 - перекрытия жилых зданий,
	// 200 кг/м2 - чердачное перекрытие,
	// ххх - может быть установлено свео значение
	var q = g * m.floorConfiguration.normativeLoad.v; // [м/с2] * [кг/м2] = [Н/м2] = [Па] Умножается на g для перехода в ед. СИ

	// Пролет - это расчетная длина балки, реальная длина балки будет конечно же больше. Так как
	// длина балки должна быть больше пролета на ширину опирания на стены.
	var l = m.beamCharacteristics.beamLength.v;

	// Расстояние между балками [м]
	var step = m.floorConfiguration.beamsStep.v / 100;



	// Значения расчетных сопротивлений [МПа] для различных типов бруса LVL
	// (источник: https://ultralam.com/ru/продукция-ультралам/лвл-брус/#1405)
	// Сжатие вдоль волокон
	var Ro = {
		// Элементы прямоугольного сечения
		'Rb': 30.0 * 1e6,     // [Па]
		'Rs': 25.5 * 1e6,     // [Па]
		'R':  23.5 * 1e6,     // [Па]
		'X':  19.5 * 1e6,     // [Па]
		'I':  22.0 * 1e6      // [Па]
	};

	// Значения расчетного сопротивления [Па] для выбранного типа балки
	var Rs = Ro[this.getSelectedValue(m.beamCharacteristics.beamType)];


	// Для конструкций, в которых напряжения, возникающие от постоянных и временных длительных нагрузок,
	// превышают 80 % суммарного напряжения от всех нагрузок, расчетное сопротивление следует дополнительно
	// умножить на коэффициент mд = 0,8. (п.5.2.в СП 64.13330.2011) http://docs.cntd.ru/document/1200084537
	var Md = (this.getSelectedValue(m.conditionOfUse.loadsCoeffMd) === 1) ? 0.8 : 1.0;	// Коэф. mд: 1) Нет (1.0); 2) Да (0.8)


	// Срок службы, согласно СНиП II-25-80 (СП 64.13330.2011): 1) до 50 лет (1.0); 2) 50-100 лет (0.9); 3) более 100 лет (0.8)
	// Коэффициент надежности по сроку службы Yncc
	var lifetime = this.getSelectedValue(m.conditionOfUse.lifeTime);
	const Yncco = {
		'lt50':     1.0,	// до 50 лет
		'50to100':  0.9,	// 50-100 лет
		'gt100':    0.8	    // более 100 лет
	};
	var Yncc = Yncco[lifetime];


	// Температуратурный режим эксплуатации: 1) до 35 град (1.0); 2) 35-40 град (0.95); 3) 45-50 град (0.85); 4) более 50 град (0.8)
	var workingTemp = this.getSelectedValue(m.conditionOfUse.temperature);
	const temperatureCoeff = {
		'lt35':     1.0,				// до 35 градусов
		'35to40':   0.95,				// 35-40 градусов
		'40to50':   0.85,				// 45-50 градусов
		'gt50':     0.8					// более 50 градусов
	};
	var Mt = temperatureCoeff[workingTemp];


	// Эксплуатационная влажность древесины/Максимальная влажность воздуха при температуре 20 °С
	var workingMoisture = this.getSelectedValue(m.conditionOfUse.woodMoistureLevel);
	const moistureCoeff = {
		'lt12': 1.0,				// до 12%/до 65%
		'lt15': 0.9,				// до 15%/до 75%
		'lt20': 0.85,				// до 20%/до 85%
		'gt20': 0.75				// более 20%/более 85%
	};
	var Mw = moistureCoeff[workingMoisture];


	// Пропитка: 1) Нет (1.0); 2) Да (0.9)
	var Ma = (this.getSelectedValue(m.beamCharacteristics.woodenImpregnation) === 'yes') ? 0.9 : 1.0;


	// !!!!!!!!!!!!! Для специфичного расчета
	// Коэффициент для балок с высотой сечения более 500 мм. Выбирается по таблице 4 [2]. Если высота сечения балки ниже 50 мм, то ставится цифра 1.
	// !!!!!!!!!!!!! Для специфичного расчета
	// Коэффициент для балок с высотой сечения более 500 мм. Выбирается по таблице 4 [2]. Если высота сечения балки ниже 50 мм, то ставится цифра 1.
	var Mb = function(beamHeight){
		/**
		 * Возвращает коэффициент Mb
		 *
		 * beamHeight: высота балки в метрах [м]
		 */

		var h = beamHeight * 1000;  // Перевод в [мм]

		var coefMb = 1.0;

		if(beamHeight === null || isNaN(beamHeight) || !(!isNaN(parseFloat(beamHeight)) && isFinite(beamHeight))){
			return coefMb;
		}

		const MbCoeff = {
			'lt500': 1.0,			    // Высота сечения менее 500 [мм]
			'gt500lt700': 0.96,		    // Высота сечения 500-600 [мм]
			'gt700lt800': 0.93,		    // Высота сечения 600-700 [мм]
			'gt800lt1000': 0.90,		// Высота сечения 700-800 [мм]
			'gt1000lt1200': 0.85,		// Высота сечения 1000-1200 [мм]
			'gt1200': 0.80			    // Высота сечения более 1200 [мм]
		};


		if(h <= 500){
			coefMb = MbCoeff['lt500'];
		}
		else if(h > 500 && h <= 700){
			coefMb = MbCoeff['gt500lt700'];
		}
		else if(h > 700 && h <= 800){
			coefMb = MbCoeff['gt700lt800'];
		}
		else if(h > 800 && h <= 1000){
			coefMb = MbCoeff['gt800lt1000'];
		}
		else if(h > 1000 && h <= 1200){
			coefMb = MbCoeff['gt1000lt1200'];
		}
		else if(h > 1200){
			coefMb = MbCoeff['gt1200'];
		}

		return coefMb;
	};




	// Предельные прогибы в долях пролета СНиП II-25-80 (СП 64.13330.2011) https://yadi.sk/i/omlr9jEdSvASnA
	var overlapType =  this.getSelectedValue(m.floorConfiguration.limitingDeflections);
	const deflections = {
		'concreteFloor': 1/350, // Перекрытия при наличии штукатурки
		'floor': 1/250,         // Балки междуэтажных перекрытий
		'attic': 1/200          // Балки чердачных перекрытий
	};
	var deflectionsMax = deflections[overlapType];  // [1] Коэффициент максимального прогиба

	// // ОБЩИЙ СЛУЧАЙ: Предельный прогиб в зависимости от длины балки
	// var deflectionsKoef = 0;
	// if (l<='1000') {deflectionsKoef = 120};
	// if (l>'1000' && l<='3000') {deflectionsKoef = (120 + ((l-1000)/2000) * (150-120))};
	// if (l>'3000' && l<='6000') {deflectionsKoef = (150 + ((l-3000)/3000) * (200-150))};
	// if (l>'6000' && l<='24000') {deflectionsKoef = (200 + ((l-6000)/18000) * (250-200))};
	// if (l>'24000' && l<='36000') {deflectionsKoef = (250 + ((l-24000)/12000) * (300-250))};
	// if (l>'36000') {deflectionsKoef = 300};
	// deflectionsMax = l/deflectionsKoef;


	// Исходные данные по высоте и ширине балки
	var srcB = m.beamCharacteristics.beamWidth.v / 1000,    // [м] - исходная ширина балки
		srcH = m.beamCharacteristics.beamHeight.v / 1000,   // [м] - исходная высота балки
		srcR = m.beamCharacteristics.beamRatio.v;           // [1] - соотношение высота/ширина





	/** Расчет балки по прочности **/
	// Теория http://doctorlom.com/item147.html
	// 1. Максимальный изгибающий момент
	var Mmax = q * Math.pow(l, 2) * step / 8; // [Па * м3]

	// 2. Требуемый момент сопротивления деревянной балки, где R - расчетное сопротивление древесины
	// https://yadi.sk/i/cE8bjeUVkkiWZg
	// https://yadi.sk/i/85sDOC7Y3cBxKw
	// https://yadi.sk/i/gn3lvolQhbYofA
	// https://yadi.sk/i/Wd88wb7piY-Ydw
	// var Wreq = Mmax / R;    // [м3]


	/** Расчет балки на прогиб **/
	// 5. Прогиб балки согласно http://doctorlom.com/item173.html#sharnir
	//
	// E - модуль упругости. Для древесины не взирая на породы согласно п.5.3 СП 64.13330.2011 при расчете по предельным состояниям второй группы это значение обычно
	// принимается равным 10000 МПа или 10х108 кгс/м2 (105 кгс/см2) вдоль волокон и Е90 = 400 МПа поперек волокон.
	// Но в действительности значение модуля упругости даже для сосны еще колеблется от 7х108 до 11х108 кгс/м2 в зависимости от влажности древесины и времени действия нагрузки.
	// При длительном действии нагрузки согласно п.5.4 СП 64.13330.2011 при расчете по предельным состояниям первой группы по деформированной схеме нужно использовать коэффициент mдс = 0.75.
	// Мы не будем определять прогиб для случая, когда временная нагрузка на балку длительная, балки перед установкой не обрабатываются глубокой пропиткой,
	// препятствующей изменению влажности древесины и относительная влажность древесины может превысить 20%, в этом случае модуль упругости будет около 6х108 кгс/м2, но значение это запомним.
	// var E = 1e10; // [Па]
	var Eo = {
		// Элементы прямоугольного сечения
		'Rb': 16.0 * 1e9,      // [Па]
		'Rs': 15.6 * 1e9,      // [Па]
		'R':  14.0 * 1e9,      // [Па]
		'X':  11.0 * 1e9,      // [Па]
		'I':  12.7 * 1e9       // [Па]
	};
	// Значения модуля упругости [Па] для выбранного типа балки
	var E = Eo[this.getSelectedValue(m.beamCharacteristics.beamType)];


	// Момент инерции для прямоугольной балки http://doctorlom.com/item160.html + http://doctorlom.com/item252.html
	// var I = srcB * Math.pow(srcH, 3) / 12;     // [м4]

	// Прогиб балки
	// var F = (5 * q * Math.pow(l, 4) * step)/(384 * E * I); // [м]


	// СНиП II-25-80 (СП 64.13330.2011) рекомендует рассчитывать деревянные конструкции так, чтобы для балок перекрытия прогиб не превышал 1/250 от длины пролета,
	// т.е. допустимый максимальный прогиб 400/250=1.6 см. Это условие нами не выполнено. Далее следует подобрать такое сечение балки, прогиб которой устраивает или Вас или СНиП.
	var Fmax = l * deflectionsMax; // [м] === (5 * q * Math.pow(l, 4) * step)/(384 * E * I)


	// // Запас прочности на прогиб
	// var Freserve = Fmax - F; // [м], если больше 0, значит балка подходящая, иначе слишком сильно "провисает"


	var ret = {};

	// Прочность
	ret.strength = {};
	ret.strength.Mmax = Mmax; // [Па * м3] Максимальный изгибающий момент
	// ret.strength.Wreq = Wreq; // [м3] Момент сопротивления деревянной балки в соответсвии с выбранным материалом и условиями эксплуатации

	// Прогиб
	ret.deflection = {};
	ret.deflection.Fmax = Fmax;   // [м] Прогиб балки




	/***************************************************************************************************************************/
	/** Аккумулирующие расчет функции **/
	var calculateBeamThroughStrength = function(data){
		/**
		 * Расчет сечения балки по прочности
		 * Числинные методы - перебор
		 *
		 * Так как поперечное сечение бруса имеет простую прямоугольную форму, то момент сопротивления бруса определяется по формуле
		 * Тогда требуемый момент сопротивления деревянной балки прямоугольного сечения будет.
		 * TODO: для других сейчений http://doctorlom.com/item160.html
		 * Wreq = b * Math.pow(h, 2) / 6; // http://doctorlom.com/item147.html формула (147.3)
		 *
		 * data.type: вариант расчета при изевестной ширине 'by-width', и по отношению высоты к ширине 'by-ratio'
		 * data.val: значение для выбранного варианта расчта
		 */

		var b = 0, h = 0;
		var Rh = 0;

		if(data.type === 'by-width'){
			b = data.val;


			// Переберём доступные варианты высоты балки
			var mH = 0;
			var delta = 0,
				deltaList = [];

			for(var mmH = 1; mmH <= 1501; mmH++){
				mH = mmH / 1000;        // [мм] -> [м]

				Rh = Rs * (Md * Yncc * Mt * Mw * Ma * Mb(mH));

				// Перебором ищем минимальное значение для уравнения h = Math.sqrt(6 * Wreq / b);
				delta = mH - Math.sqrt((6 * Mmax) / (Rh * b));

				deltaList.push(delta);
			}

			// Найдем delta максимально близкое к нулю
			var minAbsDelta = 0,
				foundH = 0;         // [м] Искомая высота балки

			for(var i = 0; i < deltaList.length; i++){
				if(i === 0 || Math.abs(deltaList[i]) < minAbsDelta){
					minAbsDelta = Math.abs(deltaList[i]);
					foundH = (i + 1) / 1000;    // [м]
				}
			}


			/*** ОШИБКА: 'Слишком большие нагрузки на балку. Перепроверьте шаг балок, длину балки, величину нагрузки.' ***/
			if(minAbsDelta === Math.abs(deltaList[0]) || minAbsDelta > 1e-2){
				// Не удалось подобрать балку в рамках численного перебора:
				// 1) либо не удалось меньшее значение подобрать, чем определитель min
				// 2) либо слишком большая погрешность в определении высоты балки - больше 1 см

				if(typeof ret.errors == 'undefined') ret.errors = {};
				ret.errors.calculation = {};
				ret.errors.calculation.beam = 'err-beam-critical-overloads';

				return ret;
			}

			h = foundH;

		}
		else if(data.type === 'by-ratio'){
			var ratio = data.val;

			// Переберём доступные варианты высоты балки
			var mH = 0;
			var delta = 0,
				deltaList = [];

			for(var mmH = 1; mmH <= 1501; mmH++){
				mH = mmH / 1000;        // [мм] -> [м]

				Rh = Rs * (Md * Yncc * Mt * Mw * Ma * Mb(mH));

				// Перебором ищем минимальное значение для уравнения h = Math.cbrt(6 * Wreq * ratio);
				delta = mH - Math.cbrt((6 * Mmax * ratio) / Rh );

				deltaList.push(delta);
			}

			// Найдем delta максимально близкое к нулю
			var minAbsDelta = 0,
				foundH = 0;         // [м] Искомая высота балки

			for(var i = 0; i < deltaList.length; i++){
				if(i === 0 || Math.abs(deltaList[i]) < minAbsDelta){
					minAbsDelta = Math.abs(deltaList[i]);
					foundH = (i + 1) / 1000;    // [м]
				}
			}


			/*** ОШИБКА: 'Слишком большие нагрузки на балку. Перепроверьте шаг балок, длину балки, величину нагрузки.' ***/
			if(minAbsDelta === Math.abs(deltaList[0]) || minAbsDelta > 1e-2){
				// Не удалось подобрать балку в рамках численного перебора:
				// 1) либо не удалось меньшее значение подобрать, чем определитель min
				// 2) либо слишком большая погрешность в определении высоты балки - больше 1 см

				if(typeof ret.errors == 'undefined') ret.errors = {};
				ret.errors.calculation = {};
				ret.errors.calculation.beam = 'err-beam-critical-overloads';

				return ret;
			}

			h = foundH;

			// Ширина балки
			b = h / ratio;
		}

		return {
			b: b,
			h: h
		}
	};


	var calculateBeamThroughDeflection = function(data){
		/**
		 * Расчет сечения балки по прогибу
		 *
		 *
		 * data.type: вариант расчета при изевестной ширине 'by-width', и по отношению высоты к ширине 'by-ratio'
		 * data.val: значение для выбранного варианта расчта
		 */

		var b = 0, h = 0;
		if(data.type === 'by-width'){
			b = data.val;

			// Тогда расчетная высота балки
			h = Math.cbrt( (60 * q * Math.pow(l, 4) * step) / (384 * E * b * Fmax) );
		}
		else if(data.type === 'by-ratio'){
			var ratio = data.val;

			// Тогда расчетная высота балки
			h = Math.sqrt(Math.sqrt( (60 * q * Math.pow(l, 4) * ratio * step) / (384 * E * Fmax) ));

			b = h / ratio;
		}

		return {
			b: b,
			h: h
		}

	};


	var detectAvailableBeamSectionSizes = function(data){
		/**
		 * Подбирает реальный возможный размер балки и ассортимента возможных
		 * Возващает NULL, для любого параметра (высота или ширина), если такого не оказалось в списке доступных, что
		 * говорит от ошибке и должно быть обработано соответсвующим образом.
		 * 		 *
		 * data.h: высота балки [мм]
		 * data.b: ширина балки [мм]
		 */

		var h = null,
			b = null;

		for(var i = 0; i < availableB[data.beamType].length; i++){
			if(availableB[data.beamType][i] >= data.b) {
				b = availableB[data.beamType][i];
				break;
			}
		}

		if(data.r && data.r > 0) {
			for (var i = 0; i < availableH[data.beamType].length; i++) {
				if(availableH[data.beamType][i] >= data.h && availableH[data.beamType][i] >= data.r * b) {
					h = availableH[data.beamType][i];
					break;
				}
			}
		}
		else{
			for (var i = 0; i < availableH[data.beamType].length; i++) {
				if (availableH[data.beamType][i] >= data.h) {
					h = availableH[data.beamType][i];
					break;
				}
			}
		}


		return {
			b: b,
			h: h
		};
	};








	if(parseInt(m.calculationVariant.knownStep.v) === 1){
		/**
		 * РАСЧЕТ СЕЧЕНИЯ БАЛКИ (Задан шаг между балками)
		 *
		 **/


		// TODO: варианты расчета
		// Ищем сечение
		var sectionByStrength = {},     // При расчете балки на прочность
			sectionByDeflection = {};   // При расчете балки на прогиб


		// Нужно еще понимать, что нам известно о сечении балки
		if(parseInt(m.knownSectionData.width.v) === 1){
			// Известна ширина балки

			sectionByStrength = calculateBeamThroughStrength({
				type: 'by-width',
				val: srcB
			});

			sectionByDeflection = calculateBeamThroughDeflection({
				type: 'by-width',
				val: srcB
			});
		}

		else if(parseInt(m.knownSectionData.ratio.v) === 1){
			// Известно соотношение сторон балки: высота/ширина

			sectionByStrength = calculateBeamThroughStrength({
				type: 'by-ratio',
				val: srcR
			});

			sectionByDeflection = calculateBeamThroughDeflection({
				type: 'by-ratio',
				val: srcR
			});
		}

		// Сечение бакли при расчете "на прочность"
		ret.strength.calcH = Math.ceil(sectionByStrength.h * 1000);                // [мм] Расчетная высота балки с учетом перевод в мм
		ret.strength.calcB = Math.ceil(sectionByStrength.b * 1000);                // [мм] Расчетная ширина балки с учетом перевод в мм
		ret.strength.square = ret.strength.calcH * ret.strength.calcB;             // [мм2]
		ret.strength.section = ret.strength.calcH + 'x' + ret.strength.calcB;      // [м x м] Текстовое прадставление сечения


		// Сечение бакли при расчете "на прочность"
		ret.deflection.calcH = Math.ceil(sectionByDeflection.h * 1000);                         // [мм] Расчетная высота балки с учетом перевод в мм
		ret.deflection.calcB = Math.ceil(sectionByDeflection.b * 1000);                         // [мм] Расчетная ширина балки с учетом перевод в мм
		ret.deflection.square = ret.deflection.calcH * ret.deflection.calcB;                    // [мм2]
		ret.deflection.section = ret.deflection.calcH + 'x' + ret.deflection.calcB;             // [м x м] Текстовое прадставление сечения
		ret.deflection.I = sectionByDeflection.b * Math.pow(sectionByDeflection.h, 3) / 12;     // [м4] Момент инерции

		// Минимально допустимое
		var sectionMin = {
			calcH: Math.max(ret.strength.calcH, ret.deflection.calcH),
			calcB: Math.max(ret.strength.calcB, ret.deflection.calcB)
		};


		//-------------------------------------------------------------
		/** Подберем возможные к ПОКУПКЕ (в рамках номенклатуры Ultralam) размеры сечения балок **/
		var availableSection = detectAvailableBeamSectionSizes({
			h: sectionMin.calcH,
			b: sectionMin.calcB,
			r: (m.knownSectionData.ratio.v === 1) ? m.beamCharacteristics.beamRatio.v : 0,
			beamType: this.getSelectedValue(m.beamCharacteristics.beamType)
		});

		/*** ОШИБКА: 'Слишком большие нагрузки на балку или нет подходящего размера балки Ultralam для выбранных условий.
		 * Перепроверьте шаг балок, длину балки, величину нагрузки, тип балки.' ***/
		// TODO: кастомизировать описание ошибки, вынести в справочник констант ошибок
		if(availableSection.h === null || availableSection.b === null){
			if(typeof ret.errors == 'undefined') ret.errors = {};
			ret.errors.calculation = {};
			ret.errors.calculation.beam = 'err-beam-critical-overloads-or-wrong-beam-type';

			return ret;
		}

		// МИНИМАЛЬНЫЕ размеры сечения балки
		ret.beamMin = {};
		ret.beamMin.calcH = sectionMin.calcH;                                // [мм] Расчетная высота балки с учетом перевод в мм
		ret.beamMin.calcB = sectionMin.calcB;                                // [мм] Расчетная ширина балки с учетом перевод в мм
		ret.beamMin.section = sectionMin.calcH + 'x' +sectionMin.calcB;      // [м x м] Текстовое прадставление сечения
		ret.beamMin.square = sectionMin.calcH * sectionMin.calcB;            // [мм2] Площадь сечения

		// ДОПУСТИМЫЕ/ПОДОБРАННЫЕ размеры сечения балки
		ret.beam = {};
		ret.beam.h = availableSection.h;                                 // [мм] Расчетная высота балки с учетом перевод в мм
		ret.beam.b = availableSection.b;                                 // [мм] Расчетная ширина балки с учетом перевод в мм
		ret.beam.section = ret.beam.h + 'x' + ret.beam.b;                // [м x м] Текстовое прадставление сечения
		ret.beam.square = ret.beam.h * ret.beam.b;                       // [мм2] Площадь сечения
		ret.beam.maxStep = m.floorConfiguration.beamsStep.v;             // [мм] Шаг между балками
		ret.beam.I = ret.beam.b * Math.pow(ret.beam.h, 3) / 12 * 1e-12;  // [м4] Момент инерции
	}




	else if(parseInt(m.calculationVariant.knownSection.v) === 1){
		/**
		 * РАСЧЕТ ШАГА МЕЖДУ (Задано сечение балки)
		 *
		 **/
		// Расчетное сопротивление балки с учетом материала, класса и коэффициентов (условий эксплуатации балки)
		var R = Rs * (Md * Yncc * Mt * Mw * Ma * Mb(srcH));

		// Расчет шага "по прочности" бакли
		//
		// Wreq = b * h^2 / 6                   [м3]
		// Wreq = Mmax/R                        [м3]
		// Mmax = q * l^2 * step / 8            [Па * м3]
		//
		// ==>
		var stepByStrength = (8 * R * srcB * Math.pow(srcH, 2))/(6 * q * Math.pow(l, 2));     // [м]
		stepByStrength = Number((stepByStrength * 100).toFixed(0));      // [см]


		// Расчет шага "на прогиб" балки
		//
		// I = (b * h^3)/ 12                        [м4]
		// F = (5 * q * l^4 * step)/(384 * E * I)   [м]
		// Fmax = l * deflectionsMax                [м]
		//
		// ==>
		var stepByDeflection = (384 * E * srcB * Math.pow(srcH, 3) * Fmax) / (60 * q * Math.pow(l, 4));     // [м]
		stepByDeflection = Number((stepByDeflection * 100).toFixed(0));


		var maxStep = Math.min(stepByStrength, stepByDeflection);

		/*** ОШИБКА: 'Слишком большие нагрузки на балку. Перепроверьте шаг балок, длину балки, величину нагрузки.' ***/
		// TODO: кастомизировать описание ошибки, вынести в справочник констант ошибок
		var bAsCm = m.beamCharacteristics.beamWidth.v / 10; // [см]
		if(maxStep <= 2 * bAsCm){
			if(typeof ret.errors == 'undefined') ret.errors = {};
			ret.errors.calculation = {};
			ret.errors.calculation.beam = 'err-beam-critical-overloads';

			return ret;
		}


		// ВВЕДЕННЫЕ размеры сечения балки
		ret.beam = {};
		ret.beam.h = m.beamCharacteristics.beamHeight.v;                 // [мм] Расчетная высота балки с учетом перевод в мм
		ret.beam.b = m.beamCharacteristics.beamWidth.v;                  // [мм] Расчетная ширина балки с учетом перевод в мм
		ret.beam.section = ret.beam.h + 'x' + ret.beam.b;                // [м x м] Текстовое прадставление сечения
		ret.beam.square = ret.beam.h * ret.beam.b;                       // [мм2] Площадь сечения
		ret.beam.I = ret.beam.b * Math.pow(ret.beam.h, 3) / 12 * 1e-12;  // [м4] Момент инерции

		ret.beam.maxStepByStrengrh = stepByStrength;                    // [см] Максимальный шаг между балками при расчете "на прочтоность"
		ret.beam.maxStepByDeflection = stepByDeflection;                // [см] Максимальный шаг между балками при расчете "на прогиб"
		ret.beam.maxStep = maxStep;                                     // [см] Максимальный шаг между балками

		step = ret.beam.maxStep / 100;

		Mmax = q * Math.pow(l, 2) * (maxStep / 100) / 8;        // [Па * м3] Максимальный изгибающий момент
	}

	ret.beam.Mmax = Mmax;		// [Па * м3] Максимальный изгибающий момент
	ret.beam.Fmax = Fmax;		// [м] Прогиб балки

	// [м3] Момент сопротивления деревянной балки в соответсвии с выбранным материалом и условиями эксплуатации
	ret.beam.Wreq = Mmax / (Rs * (Md * Yncc * Mt * Mw * Ma * Mb(ret.beam.h / 1000)));

	/** Расположение балок и их количество **/
	ret.beam.metrics = [];

	// Расставим балки
	var installPos = 0,
		wallLength = m.floorConfiguration.wallLength.v,     // [м]
		beamStep = ret.beam.maxStep / 100,                  // [м]
		beamCalcWidth = ret.beam.b / 1000;                  // [м]

	for(var pos = 0; pos <= (wallLength - beamCalcWidth); pos = pos + beamStep){
		installPos = pos;
		ret.beam.metrics.push(installPos);
	}

	// Если осталось лишнее место

	if((wallLength - (installPos + beamCalcWidth)) > 0){
		if((wallLength - (installPos + beamCalcWidth)) >= beamCalcWidth){
			// Если место достаточно под еще одну балку с расстоянием больше одной балки между ними
			// Добавим еще одну балку
			ret.beam.metrics.push(wallLength - beamCalcWidth);
		}
		else{
			// Сместим последнюю балку на край
			ret.beam.metrics[ret.beam.metrics.length - 1] = wallLength - beamCalcWidth;
		}
	}




	/** МАТЕРИАЛЫ **/
	ret.materials = {};
	ret.materials.beamH = ret.beam.h;                                              // [мм] Расчетная высота балки с учетом перевод в мм
	ret.materials.beamB = ret.beam.b;                                              // [мм] Расчетная ширина балки с учетом перевод в мм
	ret.materials.section = ret.materials.beamH + 'x' + ret.materials.beamB;       // [м x м] Текстовое прадставление сечения
	ret.materials.square = ret.materials.beamH * ret.materials.beamB;              // [мм2] Площадь сечения
	ret.materials.step = ret.beam.maxStep;                                         // [см] Шаг между балками
	ret.materials.dist = ret.beam.maxStep - (ret.beam.b / 10);                     // [см] Расстояние между балками


	// Объем материала
	ret.materials.beamCount = ret.beam.metrics.length;
	ret.materials.beamLength = m.floorConfiguration.beamFullLength.v;               // [м] Полная длина балки
	ret.materials.beamVolume = ret.materials.beamCount * ret.materials.beamLength * (ret.materials.square * 1e-6);  // [м3]
	ret.materials.beamVolume = Number(ret.materials.beamVolume.toFixed(2));

	// Стоимость материалов
	ret.materials.beamPrice = ret.materials.beamVolume * m.materialsCost.pricePerCube.v;  // [руб]
	ret.materials.beamPrice = Number(ret.materials.beamPrice.toFixed(0));



	/** ВСПОМОГАТЕЛЬНЫЕ РАСЧЕТЫ ДЛЯ ПОСТРОЕНИЯ МОДЕЛЕЙ **/
		// Размеры "дома"
	ret.house = {};
	ret.house.wallThickness = 0.3;  // [м] Толщина стен
	ret.house.wallHeight = 3;       // [м] Высота стен
	ret.house.width = m.beamCharacteristics.beamLength.v + 2 * ret.house.wallThickness;
	ret.house.length = m.floorConfiguration.wallLength.v + 2 * ret.house.wallThickness;


//	// TODO: Проверка по касательным напряжениям.
//	// TODO: Конвертировать в единицы измерения ГОСТ
//	// Можно вернуть расчетные параметры в ГОСТ-овых единицах измерения кгс
//	// 1кгс = 9.80665Н
//	// 1H = 0.101972кгс
//



	/*** Результат расчета ***/
	return ret;
}
