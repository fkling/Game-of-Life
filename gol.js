function Gol(grid, turns_per_second) {
    this.grid = grid;
    this.tps = turns_per_second;
    this.timer = null;
    this.generation = 0;
    this.running = false;
    this.alive = {};
    this.initial_cells = {};
};


Gol.prototype.setInitialCells = function(cells) {
    this.alive = cells;
    this.initial_cells = JSON.parse(JSON.stringify(cells));
    this.generation = 0;
    this.grid.setMarkedCells(JSON.parse(JSON.stringify(cells)));
}


Gol.prototype.setState = function(cells, generation) {
    this.alive = cells;
    this.generation = generation;
    this.grid.setMarkedCells(JSON.parse(JSON.stringify(cells)));
}

Gol.prototype.turn = function() {
    ++this.generation;
    var processed = {}, nalive = [], ndead = [], alive = 0;

    for(var x in this.alive) {
        for(var y in this.alive[x]) {

            var cell = [x,y],
                n = this.deadOrAlive(this.grid.getNeighbours(cell));

            // Any live cell with fewer than two live neighbours dies, as if caused by under-population.
            // Any live cell with more than three live neighbours dies, as if by overcrowding.
            if(n.alive.length < 2 || n.alive.length > 3) {
                ndead.push(cell);
            }
            // Any live cell with two or three live neighbours lives on to the next generation.
            else {
                nalive.push(cell);
                alive++;
            }

            // Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
            for(var j = n.dead.length; j--; ) {
                var cell = n.dead[j];
                if(!processed[cell] && this.deadOrAlive(this.grid.getNeighbours(cell)).alive.length === 3) {
                    nalive.push(n.dead[j]);
                    alive++;
                }
                processed[cell] = true;
            }
        }
    }

    this.alive = {};
    this.grid.clear();
    for(var i = nalive.length; i--;) {
        var c = nalive[i];
        this.markAlive(c[0], c[1]);
    }
    this.grid.setMarkedCells(this.alive);
    return alive;
};

Gol.prototype.deadOrAlive = function(cells) {
    var result = {
        dead: [],
        alive: []
    };

    var s = {true: 'alive', false: 'dead'};

    for(var i = cells.length; i--; ) {
        result[s[this.isAlive(cells[i][0], cells[i][1])]].push(cells[i]);
    }
    return result;
};


Gol.prototype.isAlive = function(x, y) {
    return !!(this.alive[x] && this.alive[x][y]);
};


Gol.prototype.markAlive = function(x, y) {
    (this.alive[x] || (this.alive[x] = {}))[y] = true;
};

Gol.prototype.markDead = function(x, y) {
    if(this.alive[x] &&  this.alive[x][y]) {
        delete this.alive[x][y];
    }
    if(Objects.keys(this.alive[x]).length === 0) {
        delete this.alive[x];
    }
}


Gol.prototype.start = function() {
    this.running = true;
    var self = this;
    this.timer = setTimeout(function() {
        var alive = self.turn();
        if(alive > 0) {
            self.timer = setTimeout(arguments.callee, 1000/self.tps);
        }
        else {
            if(self.onstop) self.onstop();
        }
    }, 1000/self.tps);
};


Gol.prototype.pause = function() {
    clearTimeout(this.timer);
    this.running = false;    
};
