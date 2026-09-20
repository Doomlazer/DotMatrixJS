// canvas defined in index.html
// c = document.getElementById("canvas");
// ctx = c.getContext("2d");
let debug = false;
let display;
 
function init() {
    window.addEventListener('click', doClick);
    window.addEventListener('keydown', doKeyDown);  
    window.addEventListener('mousemove', doMouseMove);
    window.addEventListener('mousedown', doMouseDown);
    window.addEventListener('mouseup', doMouseUp);
    //window.addEventListener("keyup", kUp);
    window.addEventListener('resize', doResize);
    
    // convert mp4
    const videoInput = document.getElementById("convertMP4");
    videoInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        try {
            const animation = await videoToAnimation(
                file,
                display,
                {
                    maxWidth: 64,
                    fps: 8,
                    maxFrames: 100,
                    //colorMode: "amber5",
                    colorMode: "palette",
                    bgColor: "#000000",

                    amberColors: [
                        "#000000", // level 0: black
                        "#443000", // level 1: dark amber
                        "#795000", // level 2: medium-dark amber
                        "#AA7000", // level 3: medium amber
                        "#FFB000"  // level 4: bright amber
                    ],

                    amberThresholds: [
                        24,
                        64,
                        120,
                        192
                    ],

                    dithering: "ordered"
                    //dithering: "floyd-steinberg"
                }
            );

            console.log(animation);

            display.animationQueue[display.selectedAnimation] = animation;
            display.width = animation.width;
            display.height = animation.height;
            display.clearPixelData(display.animationQueue[display.selectedAnimation]);
            // If you want the JSON string:
            //const json = JSON.stringify(animation);

            //console.log(json);

        } catch (error) {
            alert("Error converting video");
            console.error("Error converting video", error);
        }
    });

    // Export animation button handler
    const fileOutput = document.getElementById('export');
    fileOutput.addEventListener('click', (event) => {
        if (display.animationQueue[display.selectedAnimation]) {
            const temp = structuredClone(display.animationQueue[display.selectedAnimation]);
            //compressFrames(temp);
            let saveAs = "Animation-";
            var stringified = JSON.stringify(temp, null, 2); 
            var blob = new Blob([stringified], {type: "application/json"});
            var url = URL.createObjectURL(blob);
            
            var a = document.createElement('a');
            a.download = saveAs + display.selectedAnimation + '.json';
            a.href = url;
            a.id = saveAs;
            document.body.appendChild(a);
            a.click();
            document.querySelector('#' + a.id).remove();
        }
    });

    // import animation button handler
    const fileInput = document.getElementById('import');
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0]; // Get the selected file
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonString = e.target.result;
                    const jsonObject = JSON.parse(jsonString);
                    display.animationQueue[display.selectedAnimation] = jsonObject;
                    display.width = jsonObject.width;
                    display.height = jsonObject.height;
                    display.clearPixelData(display.animationQueue[display.selectedAnimation]);
                    //expandFrames(display.animationQueue[display.selectedAnimation]);
                } catch (error) {
                    alert('Error parsing file');
                    console.error("Error parsing file", error);
                }
            };
            reader.onerror = (error) => {
                alert('Error reading file');
            };
            reader.readAsText(file); // Read the file as text
        }
    });

    doResize();
    display = new DMDisplay();
    // background
        //bctx.fillStyle = '#000000';
        //bctx.fillRect(display.x, display.y, display.width * display.pixelSize, display.height * display.pixelSize);
    // display.printString("aAbBcCdDeEfFgGhHiIjJkKlLmMnNoO", 0, 0, '#FFB000')
    // display.printString("mMnNoOpPqQrRsStTuU", 0, 10, '#FFB000')
    // display.printString("tTuUvVwWxXyYzZaAbB", 0, 20, '#FFB000')
    let aniStr = "Test string";
    //let a = new DMAnimiation(aniStr, 10, 10, 'scroll', '#00FF00', 0); // scroll left
    //let b = new DMAnimiation('srting123456789012', 10, 15, 'scroll', '#FFB000', 20, 1); // scroll right
    //et c = new DMAnimiation('', 1, 1, 'time', '#FFB000'); // display clock
    //let d = new DMAnimiation('', 0, 0, 'animation');
    //display.animationQueue.push(a);
    //display.animationQueue.push(b);
    //display.animationQueue.push(c);
    //display.animationQueue.push(d);
    //console.log(display.animationQueue);

    requestAnimationFrame(frame);
}

function frame(timestamp) {
    //display.animationQueue = [];
    draw();
    requestAnimationFrame(frame);
}
