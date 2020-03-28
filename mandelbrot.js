let programStartTime = Date.now();

document.querySelector('body').style.backgroundColor = 'black';
let canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let c = canvas.getContext('webgl2');

let width = canvas.width;
let height = canvas.height;
let xScale = { left: undefined, right: undefined }
let yScale = { bottom: undefined, top: undefined }
setXScale(-3, 1.5);

function setXScale(left, right) {
	xScale.left = left;
	xScale.right = right;

	let xScaleSize = (xScale.right - xScale.left);
	let yScaleSize = xScaleSize * height / width;
	let yCenter = (yScale.bottom && yScale.top) ? (yScale.top + yScale.bottom) / 2 : 0;
	setYScale(yCenter);
}

function setYScale(center) {
	let xScaleSize = (xScale.right - xScale.left);
	let yScaleSize = xScaleSize * height / width;
	yScale.bottom = center - yScaleSize / 2;
	yScale.top = center + yScaleSize / 2;
}

function zoomIn(centerX, centerY, factor) {
	let xScaleSizeNew = (xScale.right - xScale.left) * factor;
	setXScale(centerX - xScaleSizeNew / 2, centerX + xScaleSizeNew / 2);
	setYScale(centerY);
}

const gpu = new GPU({canvas, context: c});
function render() {
	const iterations = 300;
	const bound = 4;
	const xstep = (xScale.right - xScale.left) / width;
	const ystep = (yScale.top - yScale.bottom) / height;
	const xleft = xScale.left;
	const ybottom = yScale.bottom;

	let timeStart = Date.now();
	drawMandelbrot(xstep, ystep, xleft, ybottom, iterations, bound);
	let timeFinish = Date.now();
}

const drawMandelbrot = gpu.createKernel(function(xstep, ystep, xleft, ybottom, iterations, bound) {
	let cX = xleft + (xstep * (this.thread.x + 1 / 2));
	let cY = ybottom + (ystep * (this.thread.y + 1 / 2));
	let nPrevX = 0; let nPrevY = 0;
	let nX = 0; let nY = 0;
	for (let i = 0; i < iterations; i++) {
		let tmpnX = nX;
		let tmpnY = nY;
		nX = nPrevX * nPrevX - nPrevY * nPrevY + cX;
		nY = 2 * nPrevX * nPrevY + cY;
		nPrevX = tmpnX;
		nPrevY = tmpnY;
		if (nX * nX + nY * nY > bound) {
	 		let clr = i / iterations;
			this.color(clr, clr, clr); // getColor(i, 1, 0), getColor(i, 1, 120), getColor(i, 1, 240));
	 		return i;
		}
	}
	this.color(0, 1, 1);
	return 0;
})
  .setGraphical(true)
  .setOutput([canvas.width, canvas.height]);

render();

function getColor(x, f, p) {
	let cos = Math.cos(Math.sqrt(x) * f + p);
	return cos * cos;
}

function screenToCoordX(screenX) {
	return xScale.left + (xScale.right - xScale.left) * screenX / width;
}

function screenToCoordY(screenY) {
	return yScale.bottom + (yScale.top - yScale.bottom) * (height - screenY) / height;
}

function centerCoordX() {
	return (xScale.left + xScale.right) / 2;
}

function centerCoordY() {
	return (yScale.top + yScale.bottom) / 2;
}

let mousePressed = false;
let mouseFromX;
let mouseFromY;
let mousePosition = { x: undefined, y: undefined }
canvas.addEventListener('mousedown', function(e) {
	let x = screenToCoordX(e.x);
	let y = screenToCoordY(e.y);
	mousePressed = true;
	mouseFromX = x;
	mouseFromY = y;
});

canvas.addEventListener('mousemove', function(e) {
	mousePosition.x = e.x; mousePosition.y = e.y;
	if (!mousePressed) return;
	let x = xScale.left + (xScale.right - xScale.left) * e.x / width;
	let y = yScale.bottom + (yScale.top - yScale.bottom) * (height - e.y) / height;
	let currentCenterX = (xScale.right + xScale.left) / 2;
	let currentCenterY = (yScale.top + yScale.bottom) / 2;
	zoomIn(currentCenterX + mouseFromX - x, currentCenterY + mouseFromY - y, 1);
	requestAnimationFrame(render);
});

canvas.addEventListener('mouseup', function(e) {
	if (!mousePressed) return;
	mousePressed = false;
	let x = xScale.left + (xScale.right - xScale.left) * e.x / width;
	let y = yScale.bottom + (yScale.top - yScale.bottom) * (height - e.y) / height;
	let currentCenterX = (xScale.right + xScale.left) / 2;
	let currentCenterY = (yScale.top + yScale.bottom) / 2;
	zoomIn(currentCenterX + mouseFromX - x, currentCenterY + mouseFromY - y, 1);
	render();
});

canvas.addEventListener('mouseout', function() {
	mousePressed = false;
});

window.addEventListener('wheel', function(event) {
	let factor = checkScrollDirectionIsUp(event) ? 1.05 : 0.97;
	let fixedPointX = screenToCoordX(mousePosition.x);
	let fixedPointY = screenToCoordY(mousePosition.y);
	let centerX = fixedPointX + (centerCoordX() - fixedPointX) * factor;
	let centerY = fixedPointY + (centerCoordY() - fixedPointY) * factor;
	zoomIn(centerX, centerY, factor);
	requestAnimationFrame(render);
	event.preventDefault();
}, { passive: false });

function checkScrollDirectionIsUp(event) {
	if (event.wheelDelta) { return event.wheelDelta > 0; }
	return event.deltaY < 0;
}

let prevPoint1 = {x: undefined, y: undefined}
let prevPoint2 = {x: undefined, y: undefined}
let prevDistance = function() { return dist(prevPoint1, prevPoint2); }
canvas.addEventListener('touchstart', function(e) {
	if (e.touches.length == 1) {
	    let x = screenToCoordX(e.touches[0].screenX);
	    let y = screenToCoordY(e.touches[0].screenY);
	    mousePressed = true;
    	mouseFromX = x;
	    mouseFromY = y;
	}
	else if (e.touches.length >= 2) {
	    prevPoint1.x = e.touches[0].screenX; prevPoint1.y = e.touches[0].screenY;
	    prevPoint2.x = e.touches[1].screenX; prevPoint2.y = e.touches[1].screenY; 
	}
});

canvas.addEventListener('touchmove', function(e) {
	if (e.touches.length === 1) {
		mousePosition.x = e.touches[0].screenX; mousePosition.y = e.touches[0].screenY;
		console.log(mousePressed);
		if (!mousePressed) return;
		let x = xScale.left + (xScale.right - xScale.left) * e.touches[0].screenX / width;
		let y = yScale.bottom + (yScale.top - yScale.bottom) * (height - e.touches[0].screenY) / height;
		let currentCenterX = (xScale.right + xScale.left) / 2;
		let currentCenterY = (yScale.top + yScale.bottom) / 2;
		zoomIn(currentCenterX + mouseFromX - x, currentCenterY + mouseFromY - y, 1);
		requestAnimationFrame(render);
	}
	else if (e.touches.length === 2) {
	    let distance = distXY(e.touches[0].screenX, e.touches[0].screenY, e.touches[1].screenX, e.touches[1].screenY);
		let prevDistance = prevDistance();
		if (prevDistance) {
		    let factor = prevDistance < distance ? 0.95 : 1.05;
	        let fixedPointX = screenToCoordX((e.touches[0].screenX + e.touches[1].screenX) / 2);
	        let fixedPointY = screenToCoordY((e.touches[0].screenY + e.touches[1].screenY) / 2);
	        let centerX = fixedPointX + (centerCoordX() - fixedPointX) * factor;
	        let centerY = fixedPointY + (centerCoordY() - fixedPointY) * factor;
	        zoomIn(centerX, centerY, factor);
    		requestAnimationFrame(render);
		}
		prevPoint1.x = e.touches[0].screenX; prevPoint1.y = e.touches[0].screenY;
		prevPoint2.x = e.touches[1].screenX; prevPoint2.y = e.touches[1].screenY;
	}
});

canvas.addEventListener('touchend', function(e) {
	if (!mousePressed) return;
	mousePressed = false;
	prevPoint1.x = undefined;
	prevPoint1.y = undefined;
	prevPoint2.x = undefined;
	prevPoint2.y = undefined;
	e.preventDefault();
});

function dist(t1, t2) {
	return Math.hypot(Math.abs(t2.x - t1.x), Math.abs(t2.y - t1.y));
}

function distXY(x1, y1, x2, y2) {
    return Math.hypot(Math.abs(x2 - x1), Math.abs(y2 - y1));
}
