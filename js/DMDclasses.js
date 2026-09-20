class DMAnimiation {
    constructor(str, x, y, type = 'scroll', color = '#FFB000', bgColor = '#000000', speed = 5, dir = 0) {
        this.str = str;
        this.x = x;
        this.y = y;
        this.width = 128;
        this.height = 32;
        this.type = type;
        this.color = color;
        this.bgColor = bgColor;
        this.speed = speed;
        this.offset = 0;
        this.aniDelay = speed;
        this.repeats = true;
        this.dir = dir;
        this.currentFrame = -1;
        this.frames = [];
        if (type == 'animation') {
            this.palette = [...display.defaultPalette];
            display.selectedColor = this.palette.length - 1;
        }
        this.paletteWidth = 16;
        this.paletteSize = 16; // swatch size
    }
}

class DMDisplay {
    constructor() {
        this.width = 64;
        this.height = 32;
        this.pixelSize = 8; // must be at least 2
        this.x = 10;
        this.y = 10;
        this.monochrome = false;
        this.roundDots = true;
        this.pixelData = -1;
        this.prevPixelData = [];
        this.animationQueue = [];
        this.editMode = true;
        this.selectedAnimation = -1;
        this.bgColor = "#000000"
        this.defaultPalette = [
            // Grayscale
            '#000000', '#1C1C1C', '#383838', '#555555',
            '#707070', '#8A8A8A', '#A6A6A6', '#C0C0C0',
            '#D7D7D7', '#E4E4E4', '#EEEEEE', '#FFFFFF',

            // Red
            '#5F0000', '#870000', '#AF0000', '#D70000',
            '#FF0000', '#FF5F5F', '#FF8787', '#FFAF87',

            // Orange
            '#5F2F00', '#875F00', '#AF5F00', '#D78700',
            '#FF8700', '#FFAF00', '#FFD75F', '#FFD787',

            // Yellow
            '#5F5F00', '#878700', '#AFAF00', '#D7D700',
            '#FFFF00', '#FFFF5F', '#FFFF87', '#FFFFAF',

            // Green
            '#005F00', '#008700', '#00AF00', '#00D700',
            '#00FF00', '#5FFF5F', '#87FF87', '#AFFFAF',

            // Cyan
            '#005F5F', '#008787', '#00AFAF', '#00D7D7',
            '#00FFFF', '#5FFFFF', '#87FFFF', '#AFFFFF',

            // Blue
            '#00005F', '#000087', '#0000AF', '#0000D7',
            '#0000FF', '#5F5FFF', '#87AFFF', '#AFAFFF',

            // Purple
            '#5F005F', '#870087', '#AF00AF', '#D700D7',
            '#FF00FF', '#FF5FFF', '#FF87FF', '#FFAFFF',

            // Brown / earth
            '#3F2700', '#5F3F00', '#875F3F', '#AF875F',
            '#D7AF87', '#D7D7AF', '#AFAF87', '#87875F',
            "#000000", "#443000", "#AA7000", "#FFB000"
        ];
        this.selectedColor = this.defaultPalette.length-1;
        // init pixelData as zeros        
        this.clearPixelData(-1);
        this.initPrevPixelData();
    }

    initPrevPixelData() {
        for (let i = 0; i < this.width * this.height; i++) {
            this.prevPixelData.push(this.bgColor)
        }
    }

    clearPixelData(ani) {
        let col;
        // no animation loaded if -1
        if (ani == -1) {
            col = "#000000";
        } else {
            col = ani.bgColor;
        }
        // fill display with black
        bctx.fillStyle = col;
        bctx.fillRect(this.x, this.y, this.width * this.pixelSize, this.height * this.pixelSize);
        
        
        // zero out pixel data
        this.pixelData = [];
        for (let i = 0; i < this.width * this.height; i++) {
            this.pixelData.push(col);
        }


        // If the animation already has frames, * load the current frame. 
        if (
            Array.isArray(ani.frames) &&
            ani.frames.length > 0 &&
            ani.currentFrame >= 0
        ) {
            this.pixelData = this.expandFrame(ani.frames[ ani.currentFrame ], ani);
            
            return;
        }
        //Otherwise create a blank frame.
        this.pixelData = new Array(this.width * this.height);
        this.pixelData.fill(col);
    }
    
    compressFrame(frame, a) {
        let temp = [];
        const palette = a?.palette || display.defaultPalette;
        console.log("palette ", palette);
        if (!Array.isArray(frame)) {
            throw new Error("compressFrame: frame must be an array");
        }

        if (!Array.isArray(palette) || palette.length === 0) {
            throw new Error("compressFrame: palette is empty");
        }

        for (let i = 0; i < frame.length; i ++) {
            // count consecutive 
            let count = 1;
            while (frame[i] === frame[i+count]) {
                count ++;
            }

            const paletteIndex = palette.indexOf(frame[i]);

            if (paletteIndex === -1) {
                console.log(
                    "BAD COLOR:",
                    JSON.stringify(frame[i]),
                    "palette:",
                    palette,
                    "position:",
                    i
                );
            }
        
            temp.push(palette.indexOf(frame[i])) 
            temp.push(count);

            if (count > 1) {
                i += count - 1;
            }
        }
        return temp;          
    }

    expandFrame(frame, animation) {
        let temp = [];

        const palette =
            animation?.palette ||
            display.defaultPalette;

        if (this.selectedColor > palette.length - 1) {
            this.selectedColor = palette.length - 1;
        }
        for (let i = 0; i < frame.length; i += 2) {
            const colorIndex = frame[i];
            const count = frame[i+1];

            for (let j = 0; j < count; j++) {
                temp.push(
                    palette[colorIndex]
                );
            }
        }

        return temp;
    }

    setPixel(x, y, color) {
        // x and y origin is 0, not 1
        this.pixelData[y * this.width + x] = color;
    }

    printString(str, x, y, color) {
        let curX = x;
        let curY = y;
        //console.log(str);
        
        for (let i = 0; i < str.length; i++) {
            // printChar returns the char width, add it to the cursor position
            curX += this.printChar(curX, curY, str[i], color);
        }
    }

    printChar(x, y, char, color) {
        let temp = getChar(char);
        let charArray = temp[0];
        let charWidth = temp[1];
        
        for (let i = 0; i < 8; i++) {
            if (debug) {console.log("charArray[i]" + charArray[i]);}
            for (let j = 0; j < 6; j++) {
                // is pixel transparent
                if (debug) {console.log(charArray[i][j]);}
                if (charArray[i][j] == 1) {
                    // check pixel within display bounds
                    if (x + j < this.width && y + i < this.height) {
                        this.setPixel(x + j, y + i, color);
                    }
                }
            }
        }
        return charWidth;
    }

    drawMatrix() {
        // draw if mouseDown
        if (mouseDown) {
            this.checkClick(mouseEvent);
        }
        
        // update animation queue
        this.animationQueue.forEach(ani => {
            this.bgColor = ani.bgColor;
            if (ani.type == 'scroll') {
                if (ani.aniDelay > 0) {
                    ani.aniDelay --;
                } else {
                    ani.aniDelay = ani.speed;
                    //let stringWidth = 
                    //console.log(ani.str);
                    if (ani.dir == 0) {
                        ani.offset ++;
                    } else {
                        ani.offset --;
                    }
                }
                this.printString(ani.str, ani.x - ani.offset, ani.y, ani.color);
            } else if (ani.type == 'time') {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();
                const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                //console.log(formattedTime);
                this.printString(formattedTime, ani.x, ani.y, ani.color);
            } else if (ani.type == 'animation') {
                if (this.editMode == false) {
                    // cycle animation frames if not editing
                    if (ani.aniDelay > 0) {
                        ani.aniDelay --;
                    } else {
                        ani.aniDelay = ani.speed;
                        if (ani.currentFrame < 0) {
                            ani.currentFrame = 0;
                        } else {
                            ani.currentFrame ++;
                            if (ani.currentFrame == ani.frames.length) {
                                if (ani.repeats) {
                                    ani.currentFrame = 0;
                                } else {
                                    // ??!?! check where the queue is populated
                                    //this.animationQueue.pop(ani);
                                }
                            }
                        }
                        this.pixelData = this.expandFrame(ani.frames[ani.currentFrame], ani);
                    }
                }
                //this.pixelData = ani.frames[ani.currentFrame]
            }
        })
        
        // draw the pixels
        if (this.pixelData) {
            // for (const pixel of this.pixelData) {
            for (let p = 0; p < this.pixelData.length; p++) {
                if (p < 10) {
                    //console.log("cur", this.pixelData[p]);
                    //console.log("prev", this.prevPixelData[p]);
                }
                if (this.pixelData[p] != this.prevPixelData[p]) {
                    // blackout square first
                    bctx.fillStyle = this.bgColor //'#000000';
                    bctx.fillRect(this.pixelSize * (p % this.width) + this.x,
                                    this.pixelSize * Math.floor(p / this.width) + this.y, 
                                    this.pixelSize, 
                                    this.pixelSize);

                    bctx.fillStyle = this.pixelData[p];
                    if (this.roundDots) {
                        bctx.beginPath();
                        bctx.moveTo((this.pixelSize/2) + this.pixelSize * (p % this.width) + this.x, 
                                (this.pixelSize/2) + this.pixelSize * Math.floor(p / this.width) + this.y);
                        bctx.arc((this.pixelSize/2) + this.pixelSize * (p % this.width) + this.x, 
                                (this.pixelSize/2) + this.pixelSize * Math.floor(p / this.width) + this.y,  
                                this.pixelSize / 2, // radius 
                                0, 360);
                        bctx.fill();
                    } else {
                        bctx.fillRect(this.pixelSize * (p % this.width) + this.x,
                                    this.pixelSize * Math.floor(p / this.width) + this.y, 
                                    this.pixelSize - 1, 
                                    this.pixelSize - 1);
                    }
                }
            }
            ctx.drawImage(b, 0, 0); // copy off screen canvas to screen
            this.prevPixelData = [...this.pixelData];
        }

        if (this.editMode == true) {
            if (this.selectedAnimation > -1) {
                // draw the palette colors
                let a = this.animationQueue[this.selectedAnimation];
                if (a.type == 'animation') {
                    this.drawPalette(a);
                    ctx.font = "20px Arial";
                    ctx.fillStyle = '#030000ff';
                    ctx.fillText("Frame " + (a.currentFrame + 1) + " of " + a.frames.length, this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 30 + this.y);
                    ctx.fillText("New Frame: press 'n'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 60 + this.y);
                    ctx.fillText("Clone current Frame: press 'c'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 80 + this.y);
                    ctx.fillText("Delete current Frame: press 'd'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 100 + this.y);
                    ctx.fillText("Prev Frame: press 'o'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 120 + this.y);
                    ctx.fillText("Next Frame: press 'p'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 140 + this.y);
                    //ctx.fillText("Shift click to erase dot/pixel", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 160 + this.y);
                    ctx.fillText("Toggle edit/play mode: press 'e'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 180 + this.y);
                    //ctx.fillText("Toggle dot/pixel: press 't'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 190 + this.y);
                    ctx.fillText("Shift left/right: press 't' & 'y'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 220 + this.y);
                    ctx.fillText("Shift up/down: press 'u' & 'i'", this.x + (a.paletteSize * a.paletteWidth) + 20, this.height * this.pixelSize + 240 + this.y);
                }
            } else {
                // console.log("printing button");
                ctx.font = "20px Arial";
                ctx.fillStyle = '#030000ff';
                ctx.fillText("Click to add animation", this.x, this.height * this.pixelSize + 20 + this.y);
            }
        } else {
            ctx.font = "20px Arial";
            ctx.fillStyle = '#000000';
            ctx.fillText("Toggle edit/play mode: press 'e'", this.x + 20, this.height * this.pixelSize + 180 + this.y);
        }
    }

    drawPalette(ani) {
        let count = 0;
        let pSize = ani.paletteSize;
        //console.log( pSize);
        ani.palette.forEach(p => {
            ctx.fillStyle = p;
            
            ctx.fillRect((count % ani.paletteWidth) * pSize + this.x, 
                        (this.height * this.pixelSize + 10 + this.y) + (Math.floor(count/ani.paletteWidth) * pSize), 
                        pSize, 
                        pSize);
                        ctx.strokeStyle = '#000000';
            ctx.strokeRect((count % ani.paletteWidth) * pSize + this.x, 
                        (this.height * this.pixelSize + 10 + this.y) + (Math.floor(count/ani.paletteWidth) * pSize),  
                        pSize, 
                        pSize);
            count ++;
        })
        // highlight selected palette color
        count = this.selectedColor;
        
        ctx.strokeStyle = '#AA0000';
        ctx.strokeRect((count % ani.paletteWidth) * pSize + this.x, 
                        (this.height * this.pixelSize + 10 + this.y) + (Math.floor(count/ani.paletteWidth) * pSize),  
                        pSize, 
                        pSize);

    }

    checkClick(e) {
        if (this.editMode && this.selectedAnimation > -1) {
            
            // detect if click within drawn palette
            let a = this.animationQueue[this.selectedAnimation];
            if (mouseX > this.x && mouseX < this.x + (a.paletteWidth * a.paletteSize)) {
                if (mouseY > this.height * this.pixelSize + 10 + this.y && 
                    mouseY < (this.height * this.pixelSize + 10 + this.y) + ((Math.floor(a.palette.length/a.paletteWidth) + 1) * a.paletteSize)) {
                    let oX = mouseX - this.x
                    let oY = mouseY - (this.height * this.pixelSize + 10 + this.y);
                    let newX = Math.floor(oX / a.paletteSize);
                    let newY = Math.floor(oY / a.paletteSize) * a.paletteWidth;
                    let i = newY + newX;
                    if (i >= 0 && i < a.palette.length) {
                        this.selectedColor = i;
                    }
                }
            }
            
            // detect click on pixel
            //ctx.fillRect(this.x, this.y, this.width * this.pixelSize, this.height * this.pixelSize);
            if (mouseX >= this.x && mouseX <= this.x + (this.width + 1) * this.pixelSize) {
                if (mouseY >= this.y && mouseY < this.height * this.pixelSize + this.y) {
                    let oX = mouseX - this.x
                    let oY = mouseY - this.y;
                    let newX = Math.floor(oX / this.pixelSize);
                    let newY = Math.floor(oY / this.pixelSize) * this.width;
                    //console.log("newX: " + newX + ", newY: " + newY);
                    if (e.shiftKey) {
                        // do black instead of selected color on shift click
                        //a.frames[a.currentFrame][newY + newX] = '#000000';
                        this.pixelData[newY + newX] = a.bgColor;
                    } else {
                        //a.frames[a.currentFrame][newY + newX] = a.palette[this.selectedColor];
                        this.pixelData[newY + newX] = a.palette[this.selectedColor];
                    } 
                }
            }
        } else if (this.editMode) {
            //constructor(str, x, y, type = 'scroll', color = '#FFB000', bgColor = '#000000', speed = 5, dir = 0)
            this.animationQueue.push(new DMAnimiation('', 0, 0, 'animation'));
            this.selectedAnimation = this.animationQueue.length - 1;
            // be sure frame is initalized
            this.clearPixelData(this.animationQueue[this.selectedAnimation]);
            //console.log(this.pixelData);
            
            this.animationQueue[this.selectedAnimation].currentFrame = 0;
        }
    }

    shiftFrameRows(dir) {
        let frame = display.pixelData;
        const width = this.width;
        const height = this.height;

        for (let y = 0; y < height; y++) {
            const start = y * width;
            if (dir == 0) {
                // Move left pixel to right.
                const temp = frame[start];
                for (let x = 0; x < width - 1; x++) {
                    frame[start + x] = frame[start + x + 1];
                }
                frame[start + width - 1] = temp;
            } else {
                // Move right pixel to left.
                const temp = frame[start + width - 1];
                for (let x = width - 1; x > 0; x--) {
                    frame[start + x] = frame[start + x - 1];
                }
                frame[start] = temp;
            }
        }
    }


    shiftFrameColumns(dir) {
        let frame = display.pixelData;
        const width = this.width;
        const height = this.height;

        if (dir == 0) {
            // Move top row to bottom.
            const temp = frame.slice(0, width);
            for (let i = 0; i < (height - 1) * width; i++) {
                frame[i] = frame[i + width];
            }
            for (let i = 0; i < width; i++) {
                frame[(height - 1) * width + i] = temp[i];
            }
        } else {
            // Move bottom row to top.
            const start = (height - 1) * width;
            const temp = frame.slice(start, start + width);
            for (let i = start - 1; i >= 0; i--) {
                frame[i + width] = frame[i];
            }
            for (let i = 0; i < width; i++) {
                frame[i] = temp[i];
            }
        }
    }
}