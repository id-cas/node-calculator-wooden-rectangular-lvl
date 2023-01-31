var abstract3D = require('./../../cSizes3D.js');

exports.Sizes3D = Sizes3D;

function Sizes3D(sizes, ops){
	this.sizes = sizes;
	this.ops = ops;


	// Создадим все объекты сцены
	this.scene = {};

	// Создадим сцену
	this._createScene();

	// Передадим свойства экземпляра класса
	abstract3D.cSize3D.apply(this, arguments);
}

// Унаследуем методы класса cSizes3D.js
Sizes3D.prototype = Object.create(abstract3D.cSize3D.prototype);
Sizes3D.prototype.constructor = Sizes3D;

Sizes3D.prototype._createScene = function(){
	this._addGround();
	this._addWalls();

	this._addBeams();

	/** Чтобы не влиять на размеры сцены **/
	// Оси координат (в последнюю очередь)
	this.addAxis();
}


Sizes3D.prototype._addGround = function() {
	/**
	 * Добавляет поверхность земли на которой будет стоять дом
	 *
	 *       gr1 _________________________ gr2
	 *          /     _________          /
	 *        /     /        /         /
	 *      /     /________/         /
	 *    /       a[0,0,0]         /
	 *  /_______________________ /
	 * gr0                        gr3
	 *
	 *
	 *    Z
	 *    |
	 *    |
	 *    |______ X
	 *
	 */

	// Текущие размеры
	var sz = this.sizes;


	// Размеры площадки
	var groundLength = 1.5 * sz.house.length,
		groundWidth = 1.5 * sz.house.width;

	// Вычислим центр
	var a = [0, 0.01, 0];

	var gr0 = [a[0] - 0.5 * (groundLength - sz.house.length), a[1], a[2] - 0.5 * (groundWidth - sz.house.width)],
		gr1 = [gr0[0], gr0[1], gr0[2] + groundWidth],
		gr2 = [gr1[0] + groundLength, gr0[1], gr1[2]],
		gr3 = [gr2[0], gr0[1], gr0[2]];

	this.scene.ground = [
		{
			vertices: [gr0, gr1, gr2, gr3],
			polygons: [
				[0, 1, 2, 3]
			]
		}
	];
}
Sizes3D.prototype.getGround = function(){ return this.scene.ground };

Sizes3D.prototype._addWalls = function() {
	/**
	 * Добавлеяет модель стен дома на сцену
	 *
	 *    1   2  7                           8
	 *     ____  ____________________________
	 *    |    ||                            |
	 *    |    ||_______________________5    |
	 *    |    | 6                      |    |
	 *    |    |                        |    |
	 *    |    |                        |    |
	 *    |    |                        |    |
	 *    |    |________________________|    |
	 *    |    3                        4    |
	 *    |__________________________________|
	 *    0                                  9
	 *
	 *    Z
	 *    |
	 *    |
	 *    |______ X
	 *
	 */

	// Текущие размеры
	var sz = this.sizes;

	var insideLen = sz.house.length - 2 * sz.house.wallThickness,
		insideWidth = sz.house.width - 2 * sz.house.wallThickness;

	// Проеция вида сверху - плоский 3Д Полигон
	var	polygonOxz = [], y = 0;
	polygonOxz[0] = [
		0,
		y,
		0
	];
	polygonOxz[1] = [
		polygonOxz[0][0],
		polygonOxz[0][1],
		polygonOxz[0][2] + sz.house.width
	];
	polygonOxz[2] = [
		polygonOxz[1][0] + sz.house.wallThickness,
		polygonOxz[1][1],
		polygonOxz[1][2]
	];
	polygonOxz[3] = [
		polygonOxz[2][0],
		polygonOxz[2][1],
		polygonOxz[2][2] - (sz.house.width - sz.house.wallThickness)
	];
	polygonOxz[4] = [
		polygonOxz[3][0] + insideLen,
		polygonOxz[3][1],
		polygonOxz[3][2]
	];
	polygonOxz[5] = [
		polygonOxz[4][0],
		polygonOxz[4][1],
		polygonOxz[4][2] + insideWidth
	];
	polygonOxz[6] = [
		polygonOxz[5][0] - insideLen,
		polygonOxz[5][1],
		polygonOxz[5][2]
	];
	polygonOxz[7] = [
		polygonOxz[6][0],
		polygonOxz[6][1],
		polygonOxz[2][2]
	];
	polygonOxz[8] = [
		polygonOxz[7][0] + (sz.house.length - sz.house.wallThickness),
		polygonOxz[7][1],
		polygonOxz[7][2]
	];
	polygonOxz[9] = [
		polygonOxz[8][0],
		polygonOxz[8][1],
		polygonOxz[0][2]
	];


	this.scene.walls = [ this.extrudeShape(polygonOxz, 'oY', -1 * sz.house.wallHeight) ];
}
Sizes3D.prototype.getWalls = function(){ return this.scene.walls };


Sizes3D.prototype._addBeams = function() {
	/**
	 * Добавлеяет балки на стены дома
	 *
	 *
	 *     ___________________________________
	 *    |     _     _     _     _     _     |
	 *    |    | |___| |___| |___| |___| |    |
	 *    |    | |   | |   | |   | |   | |    |
	 *    |    | |   | |   | |   | |   | |    |
	 *    |    | |   | |   | |   | |   | |    |
	 *    |    | |   | |   | |   | |   | |    |
	 *    |    | |___| |___| |___| |___| |    |
	 *    |    |_|   |_|   |_|   |_|   |_|    |
	 *    |___________________________________|
	 *          0     1     2     3     4
	 *
	 *    Z
	 *    |
	 *    |
	 *    |______ X
	 *
	 */

	// Текущие размеры
	var sz = this.sizes;

	var insideLen = sz.house.length - 2 * sz.house.wallThickness,
		insideWidth = sz.house.width - 2 * sz.house.wallThickness;

	/**
	 * Создадим балку, с дополнительной точкой по середине ширины балки, для того, чтобы можно было показать
	 * ось симметрии на чертежах
	 *
	 *             _____
	 *           /     /|
	 *          /     / |
	 *         /     /  |
	 *        /     /   |
	 *       /     /    /
	 *    1 /_____/2   /
	 *      |     |   /
	 *      |     |  /
	 *      |     | /
	 *      |     |/
	 *      |_____|
	 *    0         3
	 *
	 *
	 *       Z
	 *      /
	 *     /______ X
	 *    |
	 *    |
	 *    |
	 *    Y
	 *
 	 */

	var beamLen = sz.materials['beamLength'],
		beamHeight = sz.beam['h'] / 1000,
		beamWidth = sz.beam['b'] / 1000;

	var polygonOxy = [], z = 0;
	polygonOxy[0] = [
		0,
		0,
		z
	];
	polygonOxy[1] = [
		polygonOxy[0][0],
		polygonOxy[0][1] - beamHeight,
		polygonOxy[0][2]
	];
	polygonOxy[2] = [
		polygonOxy[1][0] + beamWidth,
		polygonOxy[1][1],
		polygonOxy[1][2]
	];
	polygonOxy[3] = [
		polygonOxy[2][0],
		polygonOxy[0][1],
		polygonOxy[2][2]
	];



	var beam = this.extrudeShape(polygonOxy, 'oZ', beamLen);


	// Переместим балку в точку устновки
	this.scene.beams = [];

	beam = this.moveTo(
		beam,
		beam.vertices[0],
		[
			sz.house.wallThickness,
			-1 * sz.house.wallHeight,
			sz.house.wallThickness - 0.5 * (beamLen - insideWidth)
		]
	);


	// Расставим балки
	var beamOnPosition = {};
	for(var i = 0; i < sz.beam.metrics.length; i++){

		beamOnPosition = this.translate(beam, [sz.beam.metrics[i], 0, 0]);
		this.scene.beams.push(beamOnPosition);
	}

}
Sizes3D.prototype.getBeams = function(){ return this.scene.beams };
