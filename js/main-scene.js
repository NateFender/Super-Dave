import Player from "./player.js";

var Level1 = new Phaser.Class({
        Extends: Phaser.Scene,
        initialize:
        function Level1 ()
        {
            Phaser.Scene.call(this, { key: 'Level1' });
        },

        preload: function ()
        {

    // Runs once, loads up assets like images and audio
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
        },

        create: function ()
        {
    const map = this.make.tilemap({ key: "map" });
    // Runs once, after all assets in preload are loaded
    const tileset = map.addTilesetImage("level 1-2 tileset");
    
    const worldLayer = map.createStaticLayer("background", tileset, 0, 0);
    const groundLayer = map.createStaticLayer("foreground", tileset, 0, 0);

    groundLayer.setCollisionByProperty({ collides: true });
    worldLayer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundLayer);
    this.matter.world.convertTilemapLayer(worldLayer);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels + 16, map.heightInPixels);

    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    this.player = new Player(this, x, y);

    this.level_end = map.findObject("Objects", obj => obj.name === "level_end");

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);

    // Load up some crates from the "Crates" object layer created in Tiled
    map.getObjectLayer("Enemies").objects.forEach(crateObject => {
      const { x, y, width, height } = crateObject;

      // Tiled origin for coordinate system is (0, 1), but we want (0.5, 0.5)
      this.matter.add
        .image(x + width / 2, y - height / 2, "block")
        .setBody({ shape: "rectangle", density: 0.001 });
    });
    this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: this.onPlayerCollide,
      context: this
    });
        },

  onPlayerCollide: function({ gameObjectB })
  {
    if (this.player.sprite.x > this.level_end.x) {
      this.scene.stop('Level1');
      this.scene.start('Level2');
    }
    const tile = gameObjectB;
  }

});

var Level2 = new Phaser.Class({
        Extends: Phaser.Scene,
        initialize:
        function Level2 ()
        {
            Phaser.Scene.call(this, { key: 'Level2' });
        },

        preload: function () {
    // Runs once, loads up assets like images and audio
    this.load.tilemapTiledJSON("level 2 map", "../assets/tilemaps/level 2.json");
        },

        create: function ()
        {
    const map = this.make.tilemap({ key: "level 2 map" });
    // Runs once, after all assets in preload are loaded
    const tileset = map.addTilesetImage("level 1-2 tileset");
    
    const worldLayer = map.createStaticLayer("background", tileset, 0, 0);
    const groundLayer = map.createStaticLayer("foreground", tileset, 0, 0);

    groundLayer.setCollisionByProperty({ collides: true });
    worldLayer.setCollisionByProperty({ collides: true });
    
    // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
    // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
    // rectangle body (similar to AP).
    this.matter.world.convertTilemapLayer(groundLayer);
    this.matter.world.convertTilemapLayer(worldLayer);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    this.player = new Player(this, x, y);

    // Smoothly follow the player
    this.cameras.main.startFollow(this.player.sprite, false, 0.5, 0.5);
        }
});

export { Level1, Level2 };
