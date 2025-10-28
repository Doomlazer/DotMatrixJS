function draw() {
    // clear
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    
    /*/ circle
    ctx.strokeStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(250, 250, 50, 0, 360);
    ctx.stroke();*/

    display.drawMatrix();
    drawCursor();
}

function drawCursor() {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    let x = mouseX,
    y = mouseY;
    const line = [x,y,x,y+10,x+5,y+10,x+8,y+15,x+5,y+10,x+10,y+10,x,y];
    drawLine(line);

    if (debug) {
        ctx.font = scaleFont(0.015, "arial");
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText("x:" + x + ", y:" + y, x + 10, y+20);
    }
}

function drawLine(l) {
    ctx.beginPath();
    ctx.moveTo(l[0], l[1]);
    for (let i = 2; i < l.length; i += 2) {
        ctx.lineTo(l[i], l[i+1]);
    }
    ctx.stroke();
}