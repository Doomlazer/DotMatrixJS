function doResize() {
    c.width = getWidth() - 20;
    c.height = getHeight() - 40;
    b.width = c.width;
    b.height = c.height;
}

function getWidth() {
    // multi-browser support
    if (self.innerWidth) {
    return self.innerWidth;
    }
    if (document.documentElement && document.documentElement.clientWidth) {
    return document.documentElement.clientWidth;
    }
    if (document.body) {
    return document.body.clientWidth;
    }
}

function getHeight() {
    const offset = 40;
    if (self.innerHeight) {
    return self.innerHeight - offset;
    }
    if (document.documentElement && document.documentElement.clientHeight) {
    return document.documentElement.clientHeight - offset;
    }
    if (document.body) {
    return document.body.clientHeight - offset;
    }
}

function getRandInt(i) {
    return Math.floor(Math.random() * i);
}

function scaleFont(s, f) {
    return (c.width * s) + "px " + f;                     
}

function shuffle(array) {
    let t,r,l;
    l = array.length-1;
    while (l) {
        r = Math.floor(Math.random() * l)
        t = array[r]
        array[r] = array[l];
        array[l] = t;
        l--;
    }
}

function compressFrames(ani) {
    let ind = 0;
    ani.frames.forEach((frame, i) => {
        let temp = [];
        ind = i;
        console.log("frame exported:", frame);
        
        for (let i = 0; i < frame.length; i ++) {
            let count = 1;
            while (frame[i] === frame[i+count]) {
                // count consecutive 
                count ++;
            }
            console.log(frame[i] + count); // delete
            temp.push(frame[i] + count);
            if (count > 1) {
                i += count-1
            }
        }
        ani.frames[ind] = [...temp];          
    });
}

function expandFrames(ani) {
    let ind = 0;
    ani.frames.forEach((frame, i) => {
        let temp = [];
        ind = i;
        frame.forEach(p => {
            let colorIndex = p.slice(0,7);
            let count = p.slice(7);
            for (let j = 0; j < count; j ++) {
                temp.push(colorIndex);
                console.log("pushing", colorIndex);
            }
        });
        ani.frames[ind] = [...temp];            
        console.log("frame exported:", ani.frames[ind]);
    });
}