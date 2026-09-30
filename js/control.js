let mouseX = 0,
mouseY = 0,
mouseDown = false;
let mouseEvent;

function doMouseMove(e) {
    mouseX = e.x - 10;
    mouseY = e.y - 25;
}

function doMouseDown(e) {
    mouseEvent = e;
    mouseDown = true;    
}

function doMouseUp(e) {
    mouseDown = false;
}
 
function doClick(e) {
    display.checkClick(e);
}

function doKeyDown(e) {
    display.checkKey(e) 
}