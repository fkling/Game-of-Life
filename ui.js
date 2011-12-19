var ui = (function() {

   window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

    var grid, gol, ds,  timer, supports_localstorage,
        show_stats = false, 
        grid_changed = false, 
        first_time = false,
        stats = '', 
        loadedGame = {}, 
        newGame = true;
        store = {
            config: {
                tps: 10,
                cell_size: 10,
                wrap_around: false,
                show_stats: false
            },
            last: null,
            games: [],
        };
        
   var $canvas, $stats;


    // init functions

    function init(config) {
        $canvas =  $('#world');
        $stats = $('#stats');

        initDataStorage();
        readConfig(config);
        setUpGrid();
        loadPrevGame();
        setUpEventHandlers();
    }

     function initDataStorage() {
        supports_localstorage = !!window.localStorage;

        function empty(){ return ''};

         if(window.localStorage) {
             ds = window.localStorage;
         }
         else {
             ds = {
                 setItem: empty,
                 getItem: empty,
                 clear: empty
             };
         }
         var st = ds.getItem('gol');
         if(!st) {
             first_time = true;
             ds.setItem('gol', JSON.stringify(store));
         }
     }

     function readConfig(conf) {
         if(conf) {
             for(var prop in conf) {
                 store.config[prop] = conf[prop];
             }
         }
         var stored_conf = ds.getItem('gol');
         if(stored_conf) {
             stored_conf = JSON.parse(stored_conf);
             for(var prop in stored_conf.config) {
                 store.config[prop] = stored_conf.config[prop];
             }
         }

         $('#wrap_around').prop('checked', store.config.wrap_around);
         $('#show_stats').prop('checked', store.config.show_stats);
         $('#tps').val(store.config.tps);
         $('#cell_size').val(store.config.cell_size);

         store.games = stored_conf.games;
         store.last = stored_conf.last;

     }

     function setUpGrid() {
         grid = new Grid($canvas[0], getCellSize());
         grid.warp_around = getWrapAround();
         grid.init();

         grid.onchange = function() {
             grid_changed = true;
         };
     }

     function loadPrevGame() {
         if(store.last) {
             gol = null;
             setupGame();
             gol.setInitialCells(store.last.initial_cells);
             gol.setState(store.last.state, store.last.generation);
         }
     }

     function setUpEventHandlers() {
         // save config and game state
         $(window).bind('beforeunload', function() {
             if(gol) gol.pause();
             if(grid_changed) setupGame();
             saveState();
         });


         // resize canvas and center elements
         $(window).resize(function() {
             grid.recalculatePosition();

             $('.center').each(function() {
                 $(this).css({
                     left: ($(window).width() / 2) - ($(this).width() / 2)
                 });
             });
         }).resize();

         // Button handlers
         $('#run_button').click(function(){
             if(gol && gol.running) {
                 pauseGame();
             }
             else {
                 startOrContinueGame();
             }
         });
         $('#config_button').click(function() {
             if($('body').hasClass('config_open')) {
                 hideConfig();
             }
             else {
                 showConfig();
             }
         });

         $('#center_button').click(function() {
             grid.center();
         });

         $('#erase_button').click(function() {
             var erase = confirm('Do you want to start a new game?');
             if(erase) {
                 grid.clear();
                 setupGame(true);
             }
         });

         $('#save_button').click(supports_localstorage ? function() {
             if(!gol || grid_changed) {
                 setupGame();
             }
             gol.pause();
             if(grid.getMarkedCellsArray().length === 0) {
                alert("I won't save an empty grid!" );
                return
             }
             $('#save_dialog').dialog('open');            
         } : function() {
             alert('Your browser does not support localStorage. Please use the latest Firefox or Chrome version.');
         });

         $('#list_button').click(function() {
             $('#games_dialog').dialog('open');            
         });

         $('#info_button').click(function() {
             $('#info_dialog').dialog('open');            
         });





         // Configuration element handlers
         $('#tps').bind('change input', function() {
             if(gol) gol.tps = +this.value;
         }).change();

         $('#cell_size').bind('change input', function() {
             grid.setCellSize(+this.value);
         }).change();

         $('#wrap_around').change(function() {
             if(this.checked) {
                 grid.center();
             }
             $('body').toggleClass('wrap_around', this.checked);
             grid.setWrapAround(this.checked);
         }).change();

         $('#show_stats').change(function(e) {
             show_stats = this.checked;
             if(e.originalEvent) {
                 stats = this.checked ? getFullStats(e.originalEvent) : '';
             }
         }).change();

         // menu handler and stats handler
         (function() {
             var timer, $menu = $('#menu');
             $canvas.mousemove(function(e) {
                 $menu.stop(true, true).fadeIn();
                 clearTimeout(timer);
                 timer = setTimeout(function() {
                     $menu.stop(true, true).fadeOut();
                 }, 1500);
                 stats = show_stats ? getFullStats(e.originalEvent) : '';
             });
             $menu.mouseover(function() {
                 clearTimeout(timer);
                 $(this).stop(true, true).show();
             });
         }());

         // key event handler
         $(window).keyup(function(e) {
             if(!$('body').hasClass('dialog-open')) {
                 switch(e.keyCode) {
                     case 32: // space
                         if(gol && gol.running) {
                         pauseGame();
                     }
                     else {
                         startOrContinueGame();
                     }
                     break;
                     case 27: // escape
                         hideConfig();
                     break;
                     default:
                         return;
                 }
                 e.preventDefault();
             }
         });

         // setting up dialogs
         $("#save_dialog" ).dialog({
             autoOpen: false,
             modal: true,
             resizable: false,
             width: 800,
             open: function() {
                 $('body').addClass('dialog-open');
                 pause();
                 var pics = getPictures(gol.initial_cells, gol.alive, gol.generation);
                 $(this)
                 .find('.init_img').prop('src', pics.initial).end()
                 .find('.current_img').prop('src', pics.current).end()
                 .find('.title').val(loadedGame.title || 'Game #' + store.games.length).end()
                 .find('.descr').val(loadedGame.description || '');
             },
             buttons: {
                 "Save": function() {
                     loadedGame.title = $(this).find('.title').val();
                     loadedGame.description = $(this).find('.descr').val();
                     loadedGame.initial_cells = gol.initial_cells;
                     loadedGame.current_cells = gol.alive;
                     loadedGame.generation = gol.generation;

                     if(newGame) {
                         store.games.push(loadedGame);
                     }
                     $( this ).dialog( "close" );
                 },
                 "Cancel": function() {
                     $( this ).dialog( "close" );
                 }
             },
             close: function() {
                 $('body').removeClass('dialog-open');
                 run();
             }
         });

         $("#info_dialog").dialog({
             autoOpen: first_time,
             modal: true,
             resizable: false,
             width: 700,
             height: 600,
             buttons: {
                 Close: function() {
                     $(this).dialog('close');
                 }
             },
             open: function() {
                 $('body').addClass('dialog-open');
                 pause();
             },
             close: function() {
                 $('body').removeClass('dialog-open');
                 run();
             }
         });

         $("#games_dialog").dialog({
             autoOpen: false,
             modal: true,
             resizable: false,
             width: 700,
             height: 600,
             buttons: {
                 Close: function() {
                     $(this).dialog('close');
                 }
             },
             open: function() {
                 $('body').addClass('dialog-open');
                 pause();
                 $(this).empty();
                 for(var i = 0, len =  store.games.length; i < len; i++) {
                     createListEntry(store.games[i]);
                 }
             },
             close: function() {
                 $('body').removeClass('dialog-open');
                 run();
             }
         }).on('click', '.init_setting', function() {
             loadGame($(this).closest('.game').index(), false);
             $('#games_dialog').dialog('close');
         }).on('click', '.current_setting', function() {
             loadGame($(this).closest('.game').index(), true);
             $('#games_dialog').dialog('close');
         }).on('click', '.delete', function() {
             deleteGame($(this).closest('.game').index());
             $(this).closest('.game').fadeOut(function() {
                 $(this).remove();
             });
         }).on('mouseenter', 'button.init_setting', function() {
             $(this).closest('.game')
                .find('.initial_img').stop(true, true).fadeIn().end()
                .find('.current_img').stop(true, true).fadeOut();
         }).on('mouseenter', 'button.current_setting', function() {
             $(this).closest('.game')
                .find('.initial_img').stop(true, true).fadeOut().end()
                .find('.current_img').stop(true, true).fadeIn();
         });




         var entry = $('<div class="game"><div class="img"><img class="current_img" width="200"/><img class="initial_img" width="200"/></div><div class="title"></div><div class="descr"></div><div class="generation"></div><div class="buttons"><button class="init_setting">Load initial state</button><button class="current_setting">Load latest state</button><button class="delete">Delete</button></div>');
         function createListEntry(game) {
             var e = entry.clone();
             var pics = getPictures(game.initial_cells, game.current_cells, game.generation);
             e.find('.current_img').prop('src',  pics.current).end()
              .find('.initial_img').prop('src',  pics.initial).end()
             .find('.title').text(game.title).end()
             .find('.descr').text(game.description).end()
             .find('.generation').text('Generation: #' + game.generation).end()
             .appendTo('#games_dialog');
         }
     }

     // UI functions
     function showConfig() {
         $('body').addClass('config_open');
         $('#main').animate({'bottom': '140px'}, {easing: 'swing', step: function() {
             grid.recalculatePosition();              
         }});
     }

     function hideConfig() {
         $('body').removeClass('config_open');
         $('#main').animate({'bottom': 0}, {easing:'swing', step: function() {
             grid.recalculatePosition();              
         }});
     }


     // Game functions
     function setupGame(force) {
         if(!gol || force) {
             newGame = true;
             gol = new Gol(grid, getTPS());
             gol.onstop = function() {
                 pauseGame();
             };
         }
         if(grid_changed) {
             gol.setInitialCells(grid.getMarkedCells());
             grid_changed = false;
         }
     }


     function startOrContinueGame() {
         setupGame();

         if(grid.getMarkedCellsArray().length === 0) {
             alert('No cell is alive.');
             return;
         }

         $('body').addClass('running');
         gol.start();
         grid.setEnableDraw(false);
         grid.draw_marked_cells = true;
         $('#run_button').prop('title', 'Pause game');
     }

     function pauseGame() {
         $('body').removeClass('running');
         gol.pause();
         grid.setEnableDraw(true);
         grid.draw_marked_cells = false;
         $('#menu').show();
         $('#run_button').prop('title', 'Start game');
     }

     function loadGame(index, current) {
         if(gol && gol.running) {
             gol.pause();
         }
         var game = store.games[index];
         gol = null;
         setupGame();
         gol.setInitialCells(game.initial_cells);
         if(current) {
             gol.setState(game.current_cells, game.generation);
         }
         loadedGame = game;
         newGame = false;
     }

     function deleteGame(index) {
         store.games.splice(index, 1);
         newGame = true;         
     }

     function run() {
         if(!$('body').hasClass('dialog-open')) {
             timer = setTimeout(function() {
                 $stats.html('#' + (gol && gol.generation || 0) + '<br>' + stats);
                 grid.draw();
                 timer = setTimeout(arguments.callee, 1000/33);
             }, 1000/33);
         }
     }

     function pause() {
         clearTimeout(timer);
     }


     // helper functions
     function getFullStats(e) {
         return ['OffsetX: ' + grid.offsetX + ' OffsetY: ' + grid.offsetY,
             'PosX: ' + e.clientX + ' PosY: ' + e.clientY,
             'DisplayCell: ' + grid.getCellFromPosition(e.clientX, e.clientY),
             'AbsoluteCell: ' + grid.getAbsoluteCellFromPosition(e.clientX, e.clientY)].join('<br>');
     }

     function getCellSize() {
         return +$('#cell_size').val();
     }

     function getTPS() {
         return +$('#tps').val();
     }

     function getWrapAround() {
         return $('#wrap_around').prop('checked');
     }

     function saveState() {
         store.config.cell_size = +$('#cell_size').val();
         store.config.tps = +$('#tps').val();
         store.config.wrap_around = $('#wrap_around').prop('checked');
         store.config.show_stats = show_stats;


         if(gol) {
             store.last = {
                 generation: gol.generation,
                 initial_cells: gol.initial_cells,
                 state: gol.alive
             };
         }

         ds.setItem('gol', JSON.stringify(store));
     }

     function getPictures(initial, current, generation) {
         var canvas = $canvas[0],
         tc = document.createElement('canvas'),
         result = {
             initial: '',
             current: '',
             ratio: 1
         };

         tc.width = grid.width / 2;
         tc.height = grid.height / 2;
         result.ratio = grid.width / grid.height;

         var tgrid = new Grid(tc, getCellSize() / 2);
         tgrid.init();

         var g = new Gol(tgrid, getTPS());
         g.setInitialCells(initial);

         tgrid.draw(true);
         result.initial = tc.toDataURL();

         g.setState(current, g.generation);
         tgrid.draw(true);
         result.current = tc.toDataURL();

         return result;
     }

     return {
         init: init,
         run: run
     };
}());
