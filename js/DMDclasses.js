class DMAnimiation {
    constructor(str, x, y, type = 'scroll', color = '#FFB000', speed = 5, dir = 0) {
        this.str = str;
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.speed = speed;
        this.offset = 0;
        this.aniDelay = speed;
        this.repeats = true;
        this.dir = dir;
        this.currentFrame = -1;
        this.frames = [];
        this.frames.push(display.pixelData);
        if (type == 'animation') {
            this.palette = display.defaultPalette; // limit to 256 color?
        }
        this.paletteWidth = 16;
        this.paletteSize = 16; // swatch size
    }
}

class DMDisplay {
    constructor() {
        this.width = 128;
        this.height = 32;
        this.pixelSize = 8; // must be at least 2
        this.x = 10;
        this.y = 10;
        this.monochrome = false;
        this.roundDots = true;
        this.pixelData = [];
        this.prevPixelData = [];
        this.animationQueue = [];
        this.editMode = true;
        this.selectedColor = 16;
        this.selectedAnimation = -1;
        this.defaultPalette = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0', 
            '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff', '#FFB000', '#AA7000', 
            '#775000', '#443000', '#0000d7', '#0000ff', '#005f00', '#005f5f', '#005f87', '#005faf', '#005fd7', '#005fff', 
            '#008700', '#00875f', '#008787', '#0087af', '#0087d7', '#0087ff', '#00af00', '#00af5f', '#00af87', '#00afaf', 
            '#00afd7', '#00afff', '#00d700', '#00d75f', '#00d787', '#00d7af', '#00d7d7', '#00d7ff', '#00ff00', '#00ff5f', 
            '#00ff87', '#00ffaf', '#00ffd7', '#00ffff', '#5f0000', '#5f005f', '#5f0087', '#5f00af', '#5f00d7', '#5f00ff', 
            '#5f5f5f', '#5f5f87', '#5f5faf', '#5f5fd7', '#5f5fff', '#5f8700', '#5f875f', '#5f8787', '#5f87af', '#5f87d7', 
            '#5f87ff', '#5faf00', '#5faf5f', '#5faf87', '#5fafaf', '#5fafd7', '#5fafff', '#5fd700', '#5fd75f', '#5fd787', 
            '#5fd7af', '#5fd7d7', '#5fd7ff', '#5fff00', '#5fff5f', '#5fff87', '#5fffaf', '#5fffd7', '#5fffff', '#870000', 
            '#87005f', '#870087', '#8700af', '#8700d7', '#8700ff', '#875f00', '#875f5f', '#875f87', '#875faf', '#875fd7', 
            '#875fff', '#878700', '#87875f', '#878787', '#8787af', '#8787d7', '#8787ff', '#87af00', '#87af5f', '#87af87', 
            '#87afaf', '#87afd7', '#87afff', '#87d700', '#87d75f', '#87d787', '#87d7af', '#87d7d7', '#87d7ff', '#87ff00', 
            '#87ff5f', '#87ff87', '#87ffaf', '#87ffd7', '#87ffff', '#af0000', '#af005f', '#af0087', '#af00af', '#af00d7', 
            '#af00ff', '#af5f00', '#af5f5f', '#af5f87', '#af5faf', '#af5fd7', '#af5fff', '#af8700', '#af875f', '#af8787', 
            '#af87af', '#af87d7', '#af87ff', '#afaf00', '#afaf5f', '#afaf87', '#afafaf', '#afafd7', '#afafff', '#afd700', 
            '#afd75f', '#afd787', '#afd7af', '#afd7d7', '#afd7ff', '#afff00', '#afff5f', '#afff87', '#afffaf', '#afffd7', 
            '#afffff', '#d70000', '#d7005f', '#d70087', '#d700af', '#d700d7', '#d700ff', '#d75f00', '#d75f5f', '#d75f87', 
            '#d75faf', '#d75fd7', '#d75fff', '#d78700', '#d7875f', '#d78787', '#d787af', '#d787d7', '#d787ff', '#d7af00', 
            '#d7af5f', '#d7af87', '#d7afaf', '#d7afd7', '#d7afff', '#d7d700', '#d7d75f', '#d7d787', '#d7d7af', '#d7d7d7', 
            '#d7d7ff', '#d7ff00', '#d7ff5f', '#d7ff87', '#d7ffaf', '#d7ffd7', '#d7ffff', '#ff0000', '#ff005f', '#ff0087', 
            '#000000', '#00005f', '#000087', '#0000af', '#ff5f5f', '#ff5f87', '#ff5faf', '#ff5fd7', '#ff5fff', '#ff8700', 
            '#ff875f', '#ff8787', '#ff87af', '#ff87d7', '#ff87ff', '#ffaf00', '#ffaf5f', '#ffaf87', '#ffafaf', '#ffafd7', 
            '#ffafff', '#ffd700', '#ffd75f', '#ffd787', '#ffd7af', '#ffd7d7', '#ffd7ff', '#ffff00', '#ffff5f', '#ffff87', 
            '#ffffaf', '#ffffd7', '#ffffff', '#080808', '#121212', '#1c1c1c', '#262626', '#303030', '#3a3a3a', '#444444', 
            '#4e4e4e', '#585858', '#626262', '#6c6c6c', '#767676', '#808080', '#8a8a8a', '#949494', '#9e9e9e', '#a8a8a8', 
            '#b2b2b2', '#bcbcbc', '#c6c6c6', '#d0d0d0', '#dadada', '#e4e4e4', '#eeeeee', '#FFFFFF'];

        // init pixelData as zeros        
        this.clearPixelData();
        this.initPrevPixelData();
    }

    initPrevPixelData() {
        for (let i = 0; i < this.width * this.height; i++) {
            this.prevPixelData.push('#000000')
        }
    }

    clearPixelData() {
        // fill display with black
        this.pixelData = [];
        for (let i = 0; i < this.width * this.height; i++) {
            this.pixelData.push('#000000')
        }
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
        //this.clearPixelData();
        this.animationQueue.forEach(ani => {
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
                                    this.animationQueue.pop(ani);
                                }
                            }
                        }
                    }
                }
                this.pixelData = ani.frames[ani.currentFrame];
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
                    bctx.fillStyle = '#000000';
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
                let selAni = this.animationQueue[this.selectedAnimation];
                if (selAni.type == 'animation') {
                    this.drawPalette(selAni);
                    ctx.font = "20px Arial";
                    ctx.fillStyle = '#030000ff';
                    ctx.fillText("Frame " + (selAni.currentFrame + 1) + " of " + selAni.frames.length, this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 30 + this.y);
                    ctx.fillText("New Frame: press 'n'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 60 + this.y);
                    ctx.fillText("Clone current Frame: press 'c'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 80 + this.y);
                    ctx.fillText("Delete current Frame: press 'd'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 100 + this.y);
                    ctx.fillText("Prev Frame: press 'o'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 120 + this.y);
                    ctx.fillText("Next Frame: press 'p'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 140 + this.y);
                    //ctx.fillText("Shift click to erase dot/pixel", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 160 + this.y);
                    ctx.fillText("Toggle edit/play mode: press 'e'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 180 + this.y);
                    //ctx.fillText("Toggle dot/pixel: press 't'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 190 + this.y);
                    ctx.fillText("Shift left/right: press 't' & 'y'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 220 + this.y);
                    ctx.fillText("Shift up/down: press 'u' & 'i'", this.x + (selAni.paletteSize * selAni.paletteWidth) + 20, this.height * this.pixelSize + 240 + this.y);
                }
            } else {
                // console.log("printing button");
                ctx.font = "20px Arial";
                ctx.fillStyle = '#030000ff';
                ctx.fillText("Click to add animation", this.x, this.height * this.pixelSize + 20 + this.y);
            }
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
            let selAni = this.animationQueue[this.selectedAnimation];
            if (mouseX > this.x && mouseX < this.x + (selAni.paletteWidth * selAni.paletteSize)) {
                if (mouseY > this.height * this.pixelSize + 10 + this.y && 
                    mouseY < (this.height * this.pixelSize + 10 + this.y) + ((Math.floor(selAni.palette.length/selAni.paletteWidth) + 1) * selAni.paletteSize)) {
                    let oX = mouseX - this.x
                    let oY = mouseY - (this.height * this.pixelSize + 10 + this.y);
                    let newX = Math.floor(oX / selAni.paletteSize);
                    let newY = Math.floor(oY / selAni.paletteSize) * selAni.paletteWidth;
                    this.selectedColor = newY + newX;
                    //console.log("newX: " + newX + ", newY: " + newY);
                }
            }
            // detect click on pixel
            //ctx.fillRect(this.x, this.y, this.width * this.pixelSize, this.height * this.pixelSize);
            if (mouseX >= this.x && mouseX <= (this.width+ 1) * this.pixelSize) {
                if (mouseY >= this.y && mouseY < this.height * this.pixelSize + this.y) {
                    let oX = mouseX - this.x
                    let oY = mouseY - this.y;
                    let newX = Math.floor(oX / this.pixelSize);
                    let newY = Math.floor(oY / this.pixelSize) * this.width;
                    //console.log("newX: " + newX + ", newY: " + newY);
                    if (e.shiftKey) {
                        // do black instead of selected color on shift click
                        selAni.frames[selAni.currentFrame][newY + newX] = '#000000';
                    } else {
                        selAni.frames[selAni.currentFrame][newY + newX] = selAni.palette[this.selectedColor];
                    } 
                }
            }
        } else if (this.editMode) {
            this.animationQueue.push(new DMAnimiation('', 0, 0, 'animation'));
            this.selectedAnimation = this.animationQueue.length - 1;
            //console.log(this.animationQueue);
            
            this.animationQueue[this.selectedAnimation].currentFrame = 0;
        }
    }

    shiftFrameRows(dir) {
        let selAni = this.animationQueue[this.selectedAnimation];
        let frame = selAni.frames[selAni.currentFrame];
        for (let i = 0; i < this.height; i++) {
            if (dir == 0) {
                let temp = frame.splice(i * this.width, 1);
                frame.splice(((i+1) * this.width) - 1, 0, temp);
            } else {
                let temp = frame.splice(((i+1) * this.width) - 1, 1);
                frame.splice(i * this.width, 0, temp);
            }
        }
    }

    shiftFrameColumns(dir) {
        let selAni = this.animationQueue[this.selectedAnimation];
        let frame = selAni.frames[selAni.currentFrame];
        if (dir == 0) {
            // move up 
            let temp = frame.splice(0, this.width);
            for (let i = 0; i < temp.length; i++) {
                frame.push(temp[i]);
            }
        } else {
            // move down
            let temp = frame.splice((frame.length - this.width), this.width);
            for (let i = temp.length - 1; i > -1; i--) {
                frame.unshift(temp[i]);
            }
        }
    }
}