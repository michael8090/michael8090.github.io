function createCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    return canvas;
}
function generateMaze(width, height, unitSize, block) {
    var maze = [];
    var xUnitCount = Math.floor(width / unitSize);
    var yUnitCount = Math.floor(height / unitSize);
    for (var i = 0; i < xUnitCount; i++) {
        maze[i] = [];
        var row = [];
        maze[i] = row;
        for (var j = 0; j < yUnitCount; j++) {
            row[j] = {
                i: i,
                j: j,
                x: i * unitSize,
                y: j * unitSize,
                w: unitSize,
                h: unitSize,
                isBlock: Math.random() < block
            };
        }
    }
    return maze;
}
function drawMaze(canvas, maze) {
    var ctx = canvas.getContext("2d");
    maze.forEach(function (row) {
        row.forEach(function (unit) {
            var fillColor = unit.isBlock ? "#46484c" : "#ffffff";
            ctx.fillStyle = fillColor;
            ctx.fillRect(unit.x, unit.y, unit.w, unit.h);
            ctx.strokeStyle = "#bebebe";
            ctx.strokeRect(unit.x, unit.y, unit.w, unit.h);
        });
    });
}
function getStartPoint(maze) {
    var i = Math.floor(Math.random() * maze[0].length);
    var j = Math.floor(Math.random() * maze.length);
    return maze[i][j];
}
function drawUnit(ctx, unit, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(unit.x, unit.y, unit.w, unit.h);
}
function drawStartPoint(ctx, startPoint) {
    drawUnit(ctx, startPoint, "#0000ff");
}
function mapGet(map, obj) {
    if (map.has(obj)) {
        return map.get(obj);
    }
    return Infinity;
}
function getPath(maze, startPoint, targetPoint) {
    // a* here
    function getId(unit) {
        return unit.x + ":" + unit.y;
    }
    var closedSet = new Set();
    var openSet = new Set([startPoint]);
    var from = new Map();
    var gScore = new WeakMap();
    var fScore = new WeakMap();
    function cost(a, b) {
        // chebyshev distance
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    function buildPath(unit) {
        var path = [unit];
        while (unit) {
            var parent_1 = from[getId(unit)];
            if (parent_1) {
                path.push(parent_1);
            }
            unit = parent_1;
        }
        return path;
    }
    gScore.set(startPoint, 0);
    fScore.set(startPoint, cost(startPoint, targetPoint));
    var _loop_1 = function () {
        var openUnits = Array.from(openSet.values());
        var current = openUnits[0];
        for (var i_1 = 0, l = openUnits.length; i_1 < l; i_1++) {
            var u = openUnits[i_1];
            if (fScore.get(u) < fScore.get(current)) {
                current = u;
            }
        }
        if (current.i === targetPoint.i && current.j === targetPoint.j) {
            return { value: buildPath(current) };
        }
        openSet.delete(current);
        closedSet.add(current);
        var i = current.i, j = current.j;
        function getMazeUnit(ix, iy) {
            var row = maze[ix];
            if (row) {
                return row[iy];
            }
        }
        var neighbors = [
            [i - 1, j],
            [i, j - 1],
            [i, j + 1],
            [i + 1, j]
        ]
            .map(function (p) { return getMazeUnit(p[0], p[1]); })
            .filter(function (u) { return !!u && !u.isBlock; });
        neighbors.forEach(function (neighbor) {
            if (closedSet.has(neighbor)) {
                return;
            }
            openSet.add(neighbor);
            // here we use the same cost method, normally it should be a different `getDistance`
            var tentasiveGScore = mapGet(gScore, current) + cost(current, neighbor);
            if (tentasiveGScore >= mapGet(gScore, neighbor)) {
                return;
            }
            from[getId(neighbor)] = current;
            gScore.set(neighbor, tentasiveGScore);
            fScore.set(neighbor, gScore.get(neighbor) + cost(neighbor, targetPoint));
        });
    };
    while (openSet.size !== 0) {
        var state_1 = _loop_1();
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return [];
}
function start() {
    var body = document.body;
    var offsetHeight = body.offsetHeight, offsetWidth = body.offsetWidth;
    var width = devicePixelRatio * offsetWidth;
    var height = devicePixelRatio * offsetHeight;
    var mazeCanvas = createCanvas(offsetWidth, offsetHeight);
    document.body.appendChild(mazeCanvas);
    var unitSize = parseInt(location.search.slice(1)) || 10;
    var maze = generateMaze(width, height, unitSize, 0.3);
    drawMaze(mazeCanvas, maze);
    var playerCanvas = createCanvas(offsetWidth, offsetHeight);
    playerCanvas.style.position = "absolute";
    playerCanvas.style.left = "0";
    playerCanvas.style.top = "0";
    document.body.appendChild(playerCanvas);
    var startPoint = getStartPoint(maze);
    var ctx = playerCanvas.getContext("2d");
    drawStartPoint(ctx, startPoint);
    var mouseEvent;
    playerCanvas.onmousemove = function (e) { return (mouseEvent = e); };
    var rowLength = maze[0].length;
    var colLength = maze.length;
    function loop() {
        if (mouseEvent) {
            ctx.clearRect(0, 0, width, height);
            drawStartPoint(ctx, startPoint);
            var i = Math.floor(mouseEvent.pageX * devicePixelRatio / unitSize);
            var j = Math.floor(mouseEvent.pageY * devicePixelRatio / unitSize);
            if (i > colLength - 1) {
                i = colLength - 1;
            }
            if (i < 0) {
                i = 0;
            }
            if (j > rowLength - 1) {
                j = rowLength - 1;
            }
            if (j < 0) {
                j = 0;
            }
            var targetPoint = maze[i][j];
            drawUnit(ctx, targetPoint, "#00ff00");
            if (!targetPoint.isBlock) {
                var path = getPath(maze, startPoint, targetPoint);
                path.shift();
                path.pop();
                path.forEach(function (unit, i) { return drawUnit(ctx, unit, "#00ff00"); });
            }
            mouseEvent = undefined;
        }
        requestAnimationFrame(loop);
    }
    loop();
}
start();
