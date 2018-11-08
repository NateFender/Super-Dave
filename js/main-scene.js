import Player from "./player.js";
import Enemy_1 from "./enemy.js";

var Level1 = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize:
  function Level1 ()
  {
    Phaser.Scene.call(this, { key: 'Level1' });
  },

  // The preload function runs once and loads up the assets for the game
  preload: function ()
  {
    //Debug variable.
    this.level_select_on = false;
    this.level_select_level = 5;

    this.load.image("RobotTileset.v1", "../assets/tilesets/0x72_16x16RobotTileset.v1.png");
    this.load.image("industrial.v2", "../assets/tilesets/industrial.v2.png");
    this.load.tilemapTiledJSON("level 1 map", "../assets/tilemaps/level 1.json");
    this.load.spritesheet(
      "player",
      "../assets/spritesheets/industrial.v2-player-sprite.png",
      {
        frameWidth: 16,
        frameHeight: 16,
        margin: 0,
        spacing: 0
      }
    );
    this.load.spritesheet(
      "enemy 1",
      "../assets/spritesheets/enemy 1.png",
      {
        frameWidth: 16,
        frameHeight: 18,
        margin: 0,
        spacing: 0
      }
    );
    this.load.image("coin", "../assets/spritesheets/coin.png");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    this.cameras.main.fadeIn(600);
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "level 1 map" });
    const robot_tileset = this.map.addTilesetImage("RobotTileset.v1");
    const industrial_tileset = this.map.addTilesetImage("industrial.v2");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const background1_layer = this.map.createStaticLayer("background 1", robot_tileset, 0, 0);
    const background2_layer = this.map.createStaticLayer("background 2", robot_tileset, 0, 0);
    const foreground1_layer = this.map.createDynamicLayer("foreground 1", industrial_tileset, 0, 0);
    const foreground2_layer = this.map.createDynamicLayer("foreground 2", robot_tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    foreground1_layer.setCollisionByProperty({ collides: true });
    foreground2_layer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(foreground1_layer);
    this.matter.world.convertTilemapLayer(foreground2_layer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("entry-exit", obj => obj.name === "spawn");
    this.player = new Player(this, x, y);
    this.player.wall_jumps_enabled = false;

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("entry-exit", obj => obj.name === "exit");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("enemies").objects.forEach(createObject => {
      const { x, y } = createObject;
      new Enemy_1(this, x, y);
      /*const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "enemy 1")
        .setBody({ shape: "rectangle", density: 0.001});
    */});
//TODO: give coins an actual sprite
    this.map.getObjectLayer("coins").objects.forEach(createObject => {
      const { x, y, width, height } = createObject;
      
      this.coin = this.matter.add
        .sprite(x + width / 2, y - height / 2, "coin", null, {label: 'coin'})
        .setBody({ shape: "rectangle", density: 0.001 })
        .setStatic(true)
        .setSensor(true); //setSensor(true) prevents the object from stopping the player with its collision
    });


    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
  },
  // Update function runs for every frame.
  update: function() {
    //Level select debug. Can be commented out if necessary
    if (this.level_select_on) {
      switch (this.level_select_level) {
        case 2:
          this.scene.stop('Level1');
          this.scene.start('Level2');
          break;
        case 3:
          this.scene.stop('Level1');
          this.scene.start('Level3');
          break;
        case 4:
          this.scene.stop('Level1');
          this.scene.start('Level4');
          break;
        case 5:
          this.scene.stop('Level1');
          this.scene.start('Level5');
          break;
      }
      this.level_select_on = false;
    }
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      this.scene.stop('Level1');
      this.scene.start('Level2');
    }
    if ((this.player.sprite.y > this.map.heightInPixels-16) || (this.player.dead)) {
      this.unsubscribePlayerCollide();
      this.player.freeze();
      const cam = this.cameras.main;
      //cam.once("camerafadeoutcomplete", () => this.scene.restart());
      cam.fade(250,0,0,0);
      this.scene.restart();
    }
  },

  // This function tests collisions and will be used to implement level hazards.
  onPlayerCollide: function({ gameObjectA, gameObjectB })
  {

    if (!gameObjectB) return;

    const tile = gameObjectB;
    if ((gameObjectB instanceof Phaser.Tilemaps.Tile) && gameObjectB.properties.is_lethal) {
      // Unsubscribe from collision events so that this logic is run only once
      this.unsubscribePlayerCollide();

      this.player.freeze();

      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    }
  }
});

var Level2 = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize:
  function Level2 ()
  {
    Phaser.Scene.call(this, { key: 'Level2' });
  },
  // The preload function runs once and loads up the assets for the level
  preload: function () {
    this.load.tilemapTiledJSON("level 2 map", "../assets/tilemaps/level 2.json");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "level 2 map" });
    const robot_tileset = this.map.addTilesetImage("RobotTileset.v1");
    const industrial_tileset = this.map.addTilesetImage("industrial.v2");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const background1_layer = this.map.createStaticLayer("background 1", robot_tileset, 0, 0);
    const background2_layer = this.map.createStaticLayer("background 2", robot_tileset, 0, 0);
    const foreground1_layer = this.map.createDynamicLayer("foreground 1", industrial_tileset, 0, 0);
    const foreground2_layer = this.map.createDynamicLayer("foreground 2", robot_tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    foreground1_layer.setCollisionByProperty({ collides: true });
    foreground2_layer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(foreground1_layer);
    this.matter.world.convertTilemapLayer(foreground2_layer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("entry-exit", obj => obj.name === "spawn");
    this.player = new Player(this, x, y);
    this.player.wall_jumps_enabled = true;

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("entry-exit", obj => obj.name === "exit");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "enemy 1")
        .setBody({ shape: "rectangle", density: 0.001});
    });
//TODO: give coins an actual sprite
    this.map.getObjectLayer("coins").objects.forEach(createObject => {
      const { x, y, width, height } = createObject;
      
      this.coin = this.matter.add
        .sprite(x + width / 2, y - height / 2, "coin", null, {label: 'coin'})
        .setBody({ shape: "rectangle", density: 0.001 })
        .setStatic(true)
        .setSensor(true); //setSensor(true) prevents the object from stopping the player with its collision
    });


    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
  },
  // Update function runs for every frame.
  update: function() {
    if (this.player.sprite.y > this.map.heightInPixels-16) {
      this.player.freeze();
      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    }
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      this.scene.stop('Level2');
      this.scene.start('Level3');
    }
  },
  // This function tests collisions and will be used to implement level hazards.
  onPlayerCollide: function({ gameObjectB })
  {
    if (!gameObjectB) return;

    const tile = gameObjectB;
    if ((gameObjectB instanceof Phaser.Tilemaps.Tile) && gameObjectB.properties.is_lethal) {
      // Unsubscribe from collision events so that this logic is run only once
      this.unsubscribePlayerCollide();

      this.player.freeze();

      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    } else if (gameObjectB && gameObjectB.type == "Image") {
      if (gameObjectB.texture.key == 'coin') {
        gameObjectB.destroy();
        this.coins++;
        console.log(this.coins);
      }
    }
  }


});

var Level3 = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize:
  function Level3 ()
  {
    Phaser.Scene.call(this, { key: 'Level3' });
  },
  // The preload function runs once and loads up the assets for the level
  preload: function () {
    this.load.tilemapTiledJSON("level 3 map", "../assets/tilemaps/level 3.json");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "level 3 map" });
    const robot_tileset = this.map.addTilesetImage("RobotTileset.v1");
    const industrial_tileset = this.map.addTilesetImage("industrial.v2");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const background1_layer = this.map.createStaticLayer("background 1", robot_tileset, 0, 0);
    const background2_layer = this.map.createStaticLayer("background 2", robot_tileset, 0, 0);
    const foreground1_layer = this.map.createDynamicLayer("foreground 1", industrial_tileset, 0, 0);
    const foreground2_layer = this.map.createDynamicLayer("foreground 2", robot_tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    foreground1_layer.setCollisionByProperty({ collides: true });
    foreground2_layer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(foreground1_layer);
    this.matter.world.convertTilemapLayer(foreground2_layer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("entry-exit", obj => obj.name === "spawn");
    this.player = new Player(this, x, y);
    this.player.wall_jumps_enabled = true;

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("entry-exit", obj => obj.name === "exit");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "enemy 1")
        .setBody({ shape: "rectangle", density: 0.001});
    });
//TODO: give coins an actual sprite
    this.map.getObjectLayer("coins").objects.forEach(createObject => {
      const { x, y, width, height } = createObject;
      
      this.coin = this.matter.add
        .sprite(x + width / 2, y - height / 2, "coin", null, {label: 'coin'})
        .setBody({ shape: "rectangle", density: 0.001 })
        .setStatic(true)
        .setSensor(true); //setSensor(true) prevents the object from stopping the player with its collision
    });


    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
  },
  // Update function runs for every frame.
  update: function() {
    if (this.player.sprite.y > this.map.heightInPixels-16) {
      this.player.freeze();
      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    }
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      this.scene.stop('Level3');
      this.scene.start('Level4');
    }
  },
  // This function tests collisions and will be used to implement level hazards.
  onPlayerCollide: function({ gameObjectB })
  {
    if (!gameObjectB) return;

    const tile = gameObjectB;
    if ((gameObjectB instanceof Phaser.Tilemaps.Tile) && gameObjectB.properties.is_lethal) {
      // Unsubscribe from collision events so that this logic is run only once
      this.unsubscribePlayerCollide();

      this.player.freeze();

      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    } else if (gameObjectB && gameObjectB.type == "Image") {
      if (gameObjectB.texture.key == 'coin') {
        gameObjectB.destroy();
        this.coins++;
        console.log(this.coins);
      }
    }
  }
});

var Level4 = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize:
  function Level4 ()
  {
    Phaser.Scene.call(this, { key: 'Level4' });
  },
  // The preload function runs once and loads up the assets for the level
  preload: function () {
    this.load.tilemapTiledJSON("level 4 map", "../assets/tilemaps/level 4.json");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "level 4 map" });
    const robot_tileset = this.map.addTilesetImage("RobotTileset.v1");
    const industrial_tileset = this.map.addTilesetImage("industrial.v2");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const background1_layer = this.map.createStaticLayer("background 1", robot_tileset, 0, 0);
    const background2_layer = this.map.createStaticLayer("background 2", robot_tileset, 0, 0);
    const foreground1_layer = this.map.createDynamicLayer("foreground 1", industrial_tileset, 0, 0);
    const foreground2_layer = this.map.createDynamicLayer("foreground 2", robot_tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    foreground1_layer.setCollisionByProperty({ collides: true });
    foreground2_layer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(foreground1_layer);
    this.matter.world.convertTilemapLayer(foreground2_layer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("entry-exit", obj => obj.name === "spawn");
    this.player = new Player(this, x, y);
    this.player.wall_jumps_enabled = true;

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("entry-exit", obj => obj.name === "exit");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "enemy 1")
        .setBody({ shape: "rectangle", density: 0.001});
    });
//TODO: give coins an actual sprite
    this.map.getObjectLayer("coins").objects.forEach(createObject => {
      const { x, y, width, height } = createObject;
      
      this.coin = this.matter.add
        .sprite(x + width / 2, y - height / 2, "coin", null, {label: 'coin'})
        .setBody({ shape: "rectangle", density: 0.001 })
        .setStatic(true)
        .setSensor(true); //setSensor(true) prevents the object from stopping the player with its collision
    });


    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
  },
  // Update function runs for every frame.
  update: function() {
    /*if (this.player.sprite.y > this.map.heightInPixels-16) {
      this.player.freeze();
      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    }*/
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      this.scene.stop('Level4');
      this.scene.start('Level5');
    }
  },

  // This function tests collisions and will be used to implement level hazards.
  onPlayerCollide: function({ gameObjectB })
  {
    if (!gameObjectB) return;

    const tile = gameObjectB;
    if ((gameObjectB instanceof Phaser.Tilemaps.Tile) && gameObjectB.properties.is_lethal) {
      // Unsubscribe from collision events so that this logic is run only once
      this.unsubscribePlayerCollide();

      this.player.freeze();

      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    } else if (gameObjectB && gameObjectB.type == "Image") {
      if (gameObjectB.texture.key == 'coin') {
        gameObjectB.destroy();
        this.coins++;
        console.log(this.coins);
      }
    }
  }


});

var Level5 = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize:
  function Level5 ()
  {
    Phaser.Scene.call(this, { key: 'Level5' });
  },
  // The preload function runs once and loads up the assets for the level
  preload: function () {
    this.load.tilemapTiledJSON("level 5 map", "../assets/tilemaps/level 5.json");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "level 5 map" });
    const robot_tileset = this.map.addTilesetImage("RobotTileset.v1");
    const industrial_tileset = this.map.addTilesetImage("industrial.v2");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const background1_layer = this.map.createStaticLayer("background 1", robot_tileset, 0, 0);
    const background2_layer = this.map.createStaticLayer("background 2", robot_tileset, 0, 0);
    const foreground1_layer = this.map.createDynamicLayer("foreground 1", industrial_tileset, 0, 0);
    const foreground2_layer = this.map.createDynamicLayer("foreground 2", robot_tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    foreground1_layer.setCollisionByProperty({ collides: true });
    foreground2_layer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(foreground1_layer);
    this.matter.world.convertTilemapLayer(foreground2_layer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("entry-exit", obj => obj.name === "spawn");
    this.player = new Player(this, x, y);
    this.player.wall_jumps_enabled = true;

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("entry-exit", obj => obj.name === "exit");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "enemy 1")
        .setBody({ shape: "rectangle", density: 0.001});
    });
//TODO: give coins an actual sprite
    this.map.getObjectLayer("coins").objects.forEach(createObject => {
      const { x, y, width, height } = createObject;
      
      this.coin = this.matter.add
        .sprite(x + width / 2, y - height / 2, "coin", null, {label: 'coin'})
        .setBody({ shape: "rectangle", density: 0.001 })
        .setStatic(true)
        .setSensor(true); //setSensor(true) prevents the object from stopping the player with its collision
    });


    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
  },
  // Update function runs for every frame.
  update: function() {
    if (this.player.sprite.y > this.map.heightInPixels-16) {
      this.player.freeze();
      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    }
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      //this.scene.stop('Level5');
      //this.scene.start('Level6');
    }
  },

  // This function tests collisions and will be used to implement level hazards.
  onPlayerCollide: function({ gameObjectB })
  {
    if (!gameObjectB) return;

    const tile = gameObjectB;
    if ((gameObjectB instanceof Phaser.Tilemaps.Tile) && gameObjectB.properties.is_lethal) {
      // Unsubscribe from collision events so that this logic is run only once
      this.unsubscribePlayerCollide();

      this.player.freeze();

      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => this.scene.restart());
    } else if (gameObjectB && gameObjectB.type == "Image") {
      if (gameObjectB.texture.key == 'coin') {
        gameObjectB.destroy();
        this.coins++;
        console.log(this.coins);
      }
    }
  }


});

export { Level1, Level2, Level3, Level4, Level5 };
