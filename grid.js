function Grid(canvas, cell_width) {
    this.cell_width = cell_width;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.markedCells_ = {};
}

Grid.prototype.hoverIndicator = true;
Grid.prototype.enableDraw = true;
Grid.prototype.wrapAround = false;

Grid.prototype.offsetX = 0;
Grid.prototype.offsetY = 0;


Grid.prototype.setEnableDraw = function(enable) {
    if(!enable) {
        this.hover_cell = null;
    }
    this.enableDraw = enable;
}


Grid.prototype.init = function() {
  var self = this, 
      prev = [,], 
      down = false,
      draw = true,
      origX = 0,
      origY = 0,
      offX = 0,
      offy = 0,
      $d = $('#debug'),
      changed = false;

  this.canvas.onmousemove = function(e) {
      if(down) {
          if(e.altKey && self.enableDraw) {
              self[draw ? 'markCell' : 'clearCell'](self.getAbsoluteCellFromPosition(e.layerX, e.layerY));
              changed = true;
          }
          else if(!self.wrapAround) { // move grid
             self.offsetX = offX - (e.layerX - origX);
             self.offsetY = offY - (e.layerY - origY);
          }
          e.preventDefault();
          e.stopPropagation();
      }

      if(self.enableDraw) {
          self.hover_cell =  self.getCellFromPosition(e.layerX, e.layerY);
      }
      else {
          self.hover_cell = null;
      }
  };

  this.canvas.onmousedown = function(e) {
     // prepare for dragging
     origX = e.layerX;
     origY = e.layerY;
     offX = self.offsetX;
     offY = self.offsetY;
     draw = !self.isMarked(self.getAbsoluteCellFromPosition(origX, origY));
     down = true;
  };

  this.canvas.onmouseup = function(e) {
      down = false;
      if(origX === e.layerX) {
          if(self.enableDraw) {
              var cell = self.getAbsoluteCellFromPosition(e.layerX, e.layerY);
              console.log(cell);
              self.toggleCell(cell);
              changed = true;
          }

      }
      if(changed) {
          if(self.onchange) self.onchange();
          changed = false;
      }
  };

  this.canvas.onmouseout = function() {
      self.hover_cell = null;
  };
};


Grid.prototype.getCellFromPosition = function(x, y) {
    return [
        Math.floor(((this.offsetX % this.cell_width) + x) / this.cell_width), 
        Math.floor(((this.offsetY % this.cell_width) + y) / this.cell_width)
    ];
};

Grid.prototype.getAbsoluteCellFromPosition = function(x, y) {
    return [
        Math.floor((this.offsetX + x) / this.cell_width), 
        Math.floor((this.offsetY + y) / this.cell_width)
    ];
};


Grid.prototype.getMarkedCells = function() {
    return this.markedCells_;
};

Grid.prototype.setMarkedCells = function(cells) {
    this.markedCells_ = cells;
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
};


Grid.prototype.getNeighbours = function(cell) {
    var maxw, maxh,
    east = +cell[0] - 1,
    north = +cell[1] - 1,
    west = east + 2,
    south = north + 2;

    if(this.wrapAround) {
        maxw = Math.floor(this.canvas.width / this.cell_width);
        maxh = Math.floor(this.canvas.height / this.cell_width);

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
};


Grid.prototype.toggleCell = function(cell) {
    if(this.isMarked(cell)) {
        this.clearCell(cell);  
    } 
    else {
        this.markCell(cell);       
    }
};


Grid.prototype.draw = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBasicGrid();
    this.drawMarkedCells();
    if(this.hover_cell && this.hoverIndicator) {
        this.drawHover();
    }

    if(this.wrapAround) {
        this.ctx.save();
        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = '#A00';
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
};


Grid.prototype.drawBasicGrid = function() {
    var width = this.canvas.width,
    height = this.canvas.height;

    this.ctx.save();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#CCC';

    this.ctx.beginPath();

    for(var w = -(this.offsetX % this.cell_width); w < width; w += this.cell_width) {
        this.ctx.moveTo(w, 0);
        this.ctx.lineTo(w, height);
    }

    for(var h = -(this.offsetY % this.cell_width); h < height; h += this.cell_width) {
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(width, h);
    }

    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
};


Grid.prototype.drawMarkedCells = function() {
    var x, y, c, xpos, ypos;

    this.ctx.save();
    this.ctx.fillColor = '#333';

    for(x in this.markedCells_) {
        c = this.markedCells_[x];
        xpos = -this.offsetX + (x * this.cell_width);
        for(y in c) {
            ypos = -this.offsetY + (y * this.cell_width);
            this.ctx.fillRect(xpos+1, ypos+1, this.cell_width - 2 , this.cell_width - 2);
        }
    }

    this.ctx.restore();

};


Grid.prototype.drawHover = function() {
    var x = -(this.offsetX % this.cell_width) + this.hover_cell[0] * this.cell_width,
    y = -(this.offsetY % this.cell_width) + this.hover_cell[1] * this.cell_width;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(100, 100, 100, 0.7)";
    this.ctx.fillRect(x, y, this.cell_width, this.cell_width);

    this.ctx.strokeStyle = "#888";
    this.ctx.beginPath();

    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.moveTo(x+this.cell_width, 0);
    this.ctx.lineTo(x+this.cell_width, this.canvas.height);

    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.moveTo(0, y+this.cell_width);
    this.ctx.lineTo(this.canvas.width, y+this.cell_width);

    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.restore();
};
