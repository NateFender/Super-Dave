import Player from "./player.js";

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
    this.load.image("level 1-2 tileset", "../assets/tilesets/level 1 tileset.png");
    this.load.tilemapTiledJSON("map", "../assets/tilemaps/level 1.json");
    this.load.image("block", "../assets/spritesheets/block.png");
    this.load.spritesheet(
      "player",
      "../assets/spritesheets/0x72-industrial-player-32px-extruded.png",
      {
        frameWidth: 32,
        frameHeight: 32,
        margin: 1,
        spacing: 2
      }
      );
    this.load.spritesheet(
      "enemy",
      "../assets/spritesheets/sprites.png",
      {
        frameWidth: 32,
        frameHeight: 32,
        margin: 1,
        spacing: 2
      }
    );
    this.load.image("coin", "../assets/spritesheets/coin.png");
  },

  // Create function runs once after preload has run
  create: function ()
  {
    // Initialize a map from the tilemap and load a tileset for it
    this.map = this.make.tilemap({ key: "map" });
    const tileset = this.map.addTilesetImage("level 1-2 tileset");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const worldLayer = this.map.createStaticLayer("background", tileset, 0, 0);
    const groundLayer = this.map.createStaticLayer("foreground", tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    groundLayer.setCollisionByProperty({ collides: true });
    worldLayer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundLayer);
    this.matter.world.convertTilemapLayer(worldLayer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.matter.world.setBounds(0, 0, this.map.widthInPixels + 16, this.map.heightInPixels + 16);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = this.map.findObject("Spawn", obj => obj.name === "Spawn Point");
    this.player = new Player(this, x, y);

    this.coins = 0;

    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = this.map.findObject("Objects", obj => obj.name === "level_end");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some objects. These will later be enemies or other level hazards.
    this.map.getObjectLayer("Enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "block")
        .setBody({ shape: "rectangle", density: 0.001});
    });
//TODO: give coins an actual sprite
    this.map.getObjectLayer("Coins").objects.forEach(createObject => {
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
      this.scene.stop('Level1');
      this.scene.start('Level2');
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
    const map = this.make.tilemap({ key: "level 2 map" });
    const tileset = map.addTilesetImage("level 1-2 tileset");
    
    // Load the layers. We're using static layers for now, but there are also dynamic layers
    const worldLayer = map.createStaticLayer("background", tileset, 0, 0);
    const groundLayer = map.createStaticLayer("foreground", tileset, 0, 0);

    // Collision is turned on for all tiles that have the boolean property "collides" set to true
    groundLayer.setCollisionByProperty({ collides: true });
    worldLayer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundLayer);
    this.matter.world.convertTilemapLayer(worldLayer);

    // This sets the bounds of the camera and the world
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Uncomment for a debug graphic for testing collisions. May cause severe slowdown.
    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    this.player = new Player(this, x, y);

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);
        
    // There is an object called level_end in the "Objects" object layer. Its x coordinate will be used to
    //   mark the end of the level
    this.level_end = map.findObject("Objects", obj => obj.name === "level_end");
  
    // This seems to be related to player collision
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });

  },
  // Update function runs for every frame.
  update: function() {
    //Test if the player is beyond the level_end object
    if (this.player.sprite.x > this.level_end.x) {
      //this.scene.stop('Level2');
      //this.scene.start('Level3');
    }

  },


});

export { Level1, Level2 };
