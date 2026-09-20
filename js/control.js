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
    //console.log("mouseDown");
    
}

function doMouseUp(e) {
    mouseDown = false;
    //console.log("mouseUp");
}
 
function doClick(e) {
    // check if click on palette
    display.checkClick(e);
}

function doKeyDown(e) {
    if (e.key == "e") {
        if (display.editMode == true) {
            // Save current frame before leaving edit mode.
            const a =
                display.animationQueue[
                    display.selectedAnimation
                ];

            if (a) {
                a.frames[a.currentFrame] =
                    display.compressFrame(
                        display.pixelData,
                        a
                    );
            }

            display.editMode = false;
        } else {
            display.editMode = true;
        }

        return;
    }

    if (!display.editMode) {
        return;
    }

    const a =
        display.animationQueue[
            display.selectedAnimation
        ];

    if (!a) {
        return;
    }

    // Save current edited frame before doing anything else.
    a.frames[a.currentFrame] =
        display.compressFrame(
            display.pixelData,
            a
        );

    if (e.key == "r") {
        display.roundDots =
            !display.roundDots;
    }

    // ---------------------------------------------------------
    // NEW FRAME
    // ---------------------------------------------------------

    if (e.key == "n") {
        display.clearPixelData(a);

        const newFrame =
            display.compressFrame(
                display.pixelData,
                a
            );

        a.frames.push(newFrame);
        a.currentFrame =
            a.frames.length - 1;
    }

    // ---------------------------------------------------------
    // CLONE FRAME
    // ---------------------------------------------------------

    if (e.key == "c") {
        const newFrame =
            display.compressFrame(
                display.pixelData,
                a
            );

        a.frames.push(newFrame);
        a.currentFrame =
            a.frames.length - 1;
    }

    // ---------------------------------------------------------
    // SHIFT
    // ---------------------------------------------------------

    if (e.key == "t") {
        display.shiftFrameRows(0);
    }

    if (e.key == "y") {
        display.shiftFrameRows(1);
    }

    if (e.key == "u") {
        display.shiftFrameColumns(0);
    }

    if (e.key == "i") {
        display.shiftFrameColumns(1);
    }

    // ---------------------------------------------------------
    // DELETE
    // ---------------------------------------------------------

    if (e.key == "d") {
        const userConfirmed =
            confirm(
                "Are you sure you want to delete frame " +
                a.currentFrame +
                "?"
            );

        if (userConfirmed) {
            if (a.frames.length > 1) {
                a.frames.splice(
                    a.currentFrame,
                    1
                );

                if (
                    a.currentFrame >=
                    a.frames.length
                ) {
                    a.currentFrame =
                        a.frames.length - 1;
                }

                display.pixelData =
                    display.expandFrame(
                        a.frames[a.currentFrame],
                        a
                    );
            } else {
                // Keep one blank frame.
                display.clearPixelData(a);

                a.frames[0] =
                    display.compressFrame(
                        display.pixelData,
                        a
                    );

                a.currentFrame = 0;
            }
        }
    }

    // ---------------------------------------------------------
    // PREVIOUS FRAME
    // ---------------------------------------------------------

    if (e.key == "o") {
        if (a.currentFrame > 0) {
            a.currentFrame--;

            display.pixelData =
                display.expandFrame(
                    a.frames[a.currentFrame],
                    a
                );
        }
    }

    // ---------------------------------------------------------
    // NEXT FRAME
    // ---------------------------------------------------------

    if (e.key == "p") {
        if (
            a.currentFrame <
            a.frames.length - 1
        ) {
            a.currentFrame++;

            display.pixelData =
                display.expandFrame(
                    a.frames[a.currentFrame],
                    a
                );
        }
    }
}