var Grid = (function(){

    function getPosition(element) {
        var left = 0, top = 0;

        do {
            left += element.offsetLeft;
            top += element.offsetTop;
        } while( (element = element.parentNode) && typeof element.offsetLeft !== 'undefined');

        return [left, top];
    }



    function Grid(placeholder, cell_size) {
        this.cell_size = cell_size;
        if(typeof placeholder.getContext !== 'function') {
            // create canvas'
            this.placeholder = placeholder;

            // prepare canvas'
            if(!(placeholder.style.position in {'relative': 0, 'absolute': 0})) {
                placeholder.style.position = 'relative';
            }

            this.width = this.placeholder.clientWidth;
            this.height = this.placeholder.clientHeight;

            this.hover_canvas = document.createElement('canvas');
            this.cells_canvas = document.createElement('canvas');
            this.background_canvas = document.createElement('canvas');

            this.hover_canvas.style.position = this.background_canvas.style.position = this.cells_canvas.style.position = 'absolute';
            this.hover_canvas.style.top = this.background_canvas.style.top = this.cells_canvas.style.top = 0;
            this.hover_canvas.style.left = this.background_canvas.style.left = this.cells_canvas.style.left = 0;
            this.hover_canvas.width = this.background_canvas.width = this.cells_canvas.width = this.width;
            this.hover_canvas.height = this.background_canvas.height = this.cells_canvas.height = this.height;

            placeholder.appendChild(this.background_canvas);
            placeholder.appendChild(this.cells_canvas);
            placeholder.appendChild(this.hover_canvas);

            this.bg_ctx = this.background_canvas.getContext('2d');
            this.h_ctx = this.hover_canvas.getContext('2d');
            this.c_ctx = this.cells_canvas.getContext('2d');
        }
        else {
            this.placeholder = placeholder.parentNode;
            this.hover_canvas = this.background_canvas = this.cells_canvas = placeholder;
            this.bg_ctx = this.h_ctx = this.c_ctx = this.hover_canvas.getContext('2d');
            this.one_canvas = true;
        }
        this.elementOffset = getPosition(this.background_canvas);
        this.markedCells_ = {};
    }



    Grid.prototype.hoverIndicator = true;
    Grid.prototype.enableDraw = true;
    Grid.prototype.wrapAround = false;

    Grid.prototype.offsetX = 0;
    Grid.prototype.offsetY = 0;
    Grid.prototype.elementOffset = [0, 0];

    Grid.prototype.dragging = false;
    Grid.prototype.hover_cell = null;
    Grid.prototype.prev_hover_cell = null;


    Grid.prototype.setEnableDraw = function(enable) {
        if(!enable) {
            this.hover_cell = null;
            if(!this.one_canvas) {
                this.h_ctx.clearRect(0,0,this.width, this.height);
            }
        }
        this.enableDraw = enable;
    };

    Grid.prototype.setWrapAround = function(enable) {
        this.wrapAround = enable;
        if(!this.one_canvas) {
            this.draw(true);
        }
    };

    Grid.prototype.setCellSize = function(size) {
        this.cell_size = size;
        if(!this.one_canvas) {
            this.draw(true);
        }
    };



    Grid.prototype.init = function() {
        var self = this, 
        down = false,
        mark = true,
        draw = false,
        origX = 0,
        origY = 0,
        offX = 0,
        offy = 0,
        changed = false;

        this.hover_canvas.onmousemove = function(e) {
            if(down) {
                if(draw) {
                    self[mark ? 'markCell' : 'clearCell'](self.getAbsoluteCellFromPosition(e));
                    changed = true;
                    self.drawMarkedCells(true);
                }
                else if(self.dragging) { // move grid
                    self.dragging = true;
                    self.offsetX = offX - (e.clientX - origX);
                    self.offsetY = offY - (e.clientY - origY);
                }
                e.preventDefault();
                e.stopPropagation();
            }

            if(self.enableDraw) {
                self.prev_hover_cell = self.hover_cell;
                self.hover_cell =  self.getCellFromPosition(e);
            }
            else {
                self.hover_cell = null;
            }
        };

        this.hover_canvas.onmousedown = function(e) {
            // prepare for dragging
            origX = e.clientX;
            origY = e.clientY;
            offX = self.offsetX;
            offY = self.offsetY;
            down = true;
            if(e.altKey && self.enableDraw) {
                mark = !self.isMarked(self.getAbsoluteCellFromPosition(origX, origY));
                draw = true;
            }
            else if(!self.wrapAround){
                self.dragging = true;
            }
            self.draw_marked_cells = true;
        };

        this.hover_canvas.onmouseup = function(e) {
            down = false;
            draw = false;
            self.dragging = false;
            if(origX === e.clientX) {
                if(self.enableDraw) {
                    var cell = self.getAbsoluteCellFromPosition(e);
                    self.toggleCell(cell);
                    changed = true;
                }

            }
            if(changed) {
                if(self.onchange) self.onchange();
                changed = false;
                if(!self.one_canvas) {
                    self.drawMarkedCells(true);
                }
            }
        };

        this.hover_canvas.onmouseout = function() {
            self.hover_cell = null;
        };
    };


    Grid.prototype.getCellFromPosition = function(x, y) {
        if(typeof y === 'undefined') {
            y = x.clientY;
            x = x.clientX;
        }
        x -= this.elementOffset[0];
        y -= this.elementOffset[1];

        return [
            Math.floor(((this.offsetX % this.cell_size) + x) / this.cell_size), 
            Math.floor(((this.offsetY % this.cell_size) + y) / this.cell_size)
        ];
    };

    Grid.prototype.getAbsoluteCellFromPosition = function(x, y) {
        if(typeof y === 'undefined') {
            y = x.clientY;
            x = x.clientX;
        }
        x -= this.elementOffset[0];
        y -= this.elementOffset[1];

        return [
            Math.floor((this.offsetX + x) / this.cell_size), 
            Math.floor((this.offsetY + y) / this.cell_size)
        ];
    };


    Grid.prototype.getMarkedCells = function() {
        return this.markedCells_;
    };

    Grid.prototype.setMarkedCells = function(cells) {
        this.markedCells_ = cells;
        this.draw(true);    
    };


    Grid.prototype.getMarkedCellsArray = function() {
        var x, y, t, result = [];
        for(x in this.markedCells_) {
            t = this.markedCells_[x];
            for(y in t) {
                result.push([x, y]);
            }
        }
        return result;
    };


    Grid.prototype.center = function() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.draw(true);
    };


    Grid.prototype.recalculatePosition = function() {
        var ref_node = this.hover_canvas.parentNode || this.hover_canvas;
        this.width = this.hover_canvas.width = ref_node.clientWidth;
        this.height = this.hover_canvas.height = ref_node.clientHeight;
        if(this.hover_canvas !== this.background_canvas) {
            this.background_canvas.width = ref_node.clientWidth;
            this.background_canvas.height = ref_node.clientHeight;
            this.cells_canvas.width = ref_node.clientWidth;
            this.cells_canvas.height = ref_node.clientHeight;
        }
        this.elementOffset = getPosition(this.background_canvas);
        this.draw(true);
    };


    Grid.prototype.getNeighbours = function(cell) {
        var maxw, maxh,
        east = +cell[0] - 1,
        north = +cell[1] - 1,
        west = east + 2,
        south = north + 2;

        if(this.wrapAround) {
            maxw = Math.floor(this.hover_canvas.width / this.cell_size);
            maxh = Math.floor(this.hover_canvas.height / this.cell_size);

            east = (east + maxw) % maxw;
            north = (north + maxh) % maxh;
            west = (west + maxw) % maxw;
            south = (south + maxh) % maxh;
        }

        return [
            [east, cell[1]],
            [east, north],
            [cell[0], north],
            [west, north],
            [west, cell[1]],
            [west, south],
            [cell[0], south],
            [east, south]
        ];
    };


    Grid.prototype.isMarked = function(cell) {
        return !!(this.markedCells_[cell[0]] && this.markedCells_[cell[0]][cell[1]]);
    };


    Grid.prototype.markCell = function(cell) {
        (this.markedCells_[cell[0]] || (this.markedCells_[cell[0]] = {}))[cell[1]] = true;
    };


    Grid.prototype.clearCell = function(cell) {
        if(this.isMarked(cell)) {
            delete this.markedCells_[cell[0]][cell[1]];
            if(Object.keys(this.markedCells_[cell[0]]).length === 0) {
                delete this.markedCells_[cell[0]];
            }
        }
    };


    Grid.prototype.clear = function() {
        this.markedCells_ = {};
        this.draw(true);
    };


    Grid.prototype.toggleCell = function(cell) {
        if(this.isMarked(cell)) {
            this.clearCell(cell);  
        } 
        else {
            this.markCell(cell);       
        }
    };


    Grid.prototype.draw = function(force) {
        if(this.one_canvas) this.bg_ctx.clearRect(0, 0, this.hover_canvas.width, this.hover_canvas.height);
        if(this.dragging || force) {
            this.drawBasicGrid(!this.one_canvas);
        }
        if(this.dragging || force) {
            this.drawMarkedCells(!this.one_canvas);
        }
        if(this.hover_cell && this.hoverIndicator && (!this.prev_hover_cell  || this.hover_cell.toString() !== this.prev_hover_cell.toString())) {
            this.drawHover(!this.one_canvas);
        }

    };


    Grid.prototype.drawBasicGrid = function(clear) {
        if(clear) this.bg_ctx.clearRect(0, 0, this.width, this.height);
        this.bg_ctx.save();
        this.bg_ctx.lineWidth = 0.5;
        this.bg_ctx.strokeStyle = '#AAA';

        this.bg_ctx.beginPath();

        for(var w = -(this.offsetX % this.cell_size); w < this.width; w += this.cell_size) {
            this.bg_ctx.moveTo(w, 0);
            this.bg_ctx.lineTo(w, this.height);
        }

        for(var h = -(this.offsetY % this.cell_size); h < this.height; h += this.cell_size) {
            this.bg_ctx.moveTo(0, h);
            this.bg_ctx.lineTo(this.width, h);
        }

        this.bg_ctx.closePath();
        this.bg_ctx.stroke();
        this.bg_ctx.restore();

        if(this.wrapAround) {
            this.bg_ctx.save();
            this.bg_ctx.lineWidth = 5;
            this.bg_ctx.strokeStyle = '#A00';
            this.bg_ctx.strokeRect(0, 0, this.hover_canvas.width, this.hover_canvas.height);
            this.bg_ctx.restore();
        }
    };


    Grid.prototype.drawMarkedCells = function(clear) {
        if(clear) this.c_ctx.clearRect(0, 0, this.width, this.height);
        var x, y, c, xpos, ypos;

        this.c_ctx.save();
        this.c_ctx.fillColor = '#333';

        for(x in this.markedCells_) {
            c = this.markedCells_[x];
            xpos = -this.offsetX + (x * this.cell_size);
            for(y in c) {
                ypos = -this.offsetY + (y * this.cell_size);
                this.c_ctx.fillRect(xpos+1, ypos+1, this.cell_size - 2 , this.cell_size - 2);
            }
        }

        this.c_ctx.restore();

    };


    Grid.prototype.drawHover = function(clear) {
        if(clear) this.h_ctx.clearRect(0, 0, this.width, this.height);
        var x = -(this.offsetX % this.cell_size) + this.hover_cell[0] * this.cell_size,
        y = -(this.offsetY % this.cell_size) + this.hover_cell[1] * this.cell_size;
        this.h_ctx.save();
        this.h_ctx.fillStyle = "rgba(100, 100, 100, 0.7)";
        this.h_ctx.fillRect(x, y, this.cell_size, this.cell_size);

        this.h_ctx.strokeStyle = "#888";
        this.h_ctx.beginPath();

        this.h_ctx.moveTo(x, 0);
        this.h_ctx.lineTo(x, this.hover_canvas.height);
        this.h_ctx.moveTo(x+this.cell_size, 0);
        this.h_ctx.lineTo(x+this.cell_size, this.hover_canvas.height);

        this.h_ctx.moveTo(0, y);
        this.h_ctx.lineTo(this.hover_canvas.width, y);
        this.h_ctx.moveTo(0, y+this.cell_size);
        this.h_ctx.lineTo(this.hover_canvas.width, y+this.cell_size);

        this.h_ctx.closePath();
        this.h_ctx.stroke();

        this.h_ctx.restore();
    };


    return Grid;

}());
