var abstract2D = require('./../../cPlanes2D.js');
var reduce3DTo2D = require('./../../cProjector3Dto2D.js'),
	d3to2 = new reduce3DTo2D.cProjector3Dto2D();

exports.Planes2D = Planes2D;

function Planes2D ( scene3D ) {

	this.s3d = scene3D;

	abstract2D.cPlanes2D.apply( this, arguments );

}

// Унаследуем методы класса cSizes2D.js
Planes2D.prototype = Object.create( abstract2D.cPlanes2D.prototype );
Planes2D.prototype.constructor = Planes2D;




/**
 * Получить вид сверху расположения стропил
 */
Planes2D.prototype.getTopPlane = function () {
	var axisFace = 'oXZ';

	var plane = {};

	/** Стены **/
	var walls = this.s3d.getWalls();
	if( walls && walls.length ) {
		// plane['walls'] = d3to2.getProjectionsByShapes(walls, axisFace, {reverse: true, allContours: false});
		plane['walls'] = [ this.getShapePlane(walls[0], [0], axisFace, false) ];
	}


	/** Балки **/
	var beams = this.s3d.getBeams();
	if( beams && beams.length ) {
		// plane['beams'] = d3to2.getProjectionsByShapes(beams, axisFace, {reverse: true, allContours: false});
		plane['beams'] = [ this.getShapesPlane(beams, [3], axisFace, false) ];
	}



	/** Развернуть весь план **/
	plane = this.planeShapesRotate( plane, [0, 0, 0], 0.5 * Math.PI );



	/**
	 * Границы проекции
	 * в формате {lim: {x: {min: *, max: *}, y: {min: *, max: *}}, sz: {x: number, y: number, z: number}}
	 * **/
	var ranges = this.getShapesPlaneRangeBox(plane);

	return {
		el: plane,  // Формы проекции
		rg: ranges  // Границы проекции
	};

}

