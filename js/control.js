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
    console.log("mouseDown");
    
}

function doMouseUp(e) {
    mouseDown = false;
    console.log("mouseUp");
}
 
function doClick(e) {
    // check if click on palette
    display.checkClick(e);
}

function doKeyDown(e) {
    if (e.key == "e") {
        if (display.editMode == true) {
            display.editMode = false;
        } else {
            display.editMode = true;
        }
    }

    if (display.editMode) {
        if (e.key == "r") {
            if (display.roundDots == true) {
                display.roundDots = false;
            } else {
                display.roundDots = true;
            }
        }

        // new frame
        if (e.key == 'n') {
            display.clearPixelData();
            let a = display.animationQueue[display.selectedAnimation];
            a.frames.push(display.pixelData);
            a.currentFrame = a.frames.length - 1;
        }

        // copy current frame to new frame
        if (e.key == 'c') {
            display.clearPixelData();
            let a = display.animationQueue[display.selectedAnimation];
            a.frames.push([...a.frames[a.currentFrame]]);
            a.currentFrame = a.frames.length - 1;
        }

        if (e.key == 't') {
            display.shiftFrameRows(0);
        }

        if (e.key == 'y') {
            display.shiftFrameRows(1);
        }

        if (e.key == 'u') {
            display.shiftFrameColumns(0);
        }

        if (e.key == 'i') {
            display.shiftFrameColumns(1);
        }

        if (e.key == 'd') {
            let a = display.animationQueue[display.selectedAnimation];
            const userConfirmed = confirm("Are you sure you want to delete frame " + a.currentFrame + "?");
            if (userConfirmed) {
                if (a.currentFrame > 0) {
                    a.frames.splice(a.currentFrame, 1);
                    a.currentFrame --;
                } else {
                    alert("Sorry, cannot remove first frame");
                }
            }
        }

        // prev frame
        if (e.key == 'o') {
            let a = display.animationQueue[display.selectedAnimation];
            if (a.currentFrame > 0) {
                a.currentFrame --;
            }
        }

        // next frame
        if (e.key == 'p') {
            let a = display.animationQueue[display.selectedAnimation];
            if (a.currentFrame < a.frames.length - 1) {
                a.currentFrame ++;
            }
        }
    }
}
