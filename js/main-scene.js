import Player from "./player.js";

export default class MainScene extends Phaser.Scene {
  preload() {
    // Runs once, loads up assets like images and audio
    this.load.image("level 1-2 tileset", "../assets/tilesets/level 1 tileset.png");
    this.load.tilemapTiledJSON("map", "../assets/tilemaps/level 1.json");
    this.load.atlas("emoji", "../assets/atlases/emoji.png", "../assets/atlases/emoji.json");
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
  }

  create() {
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

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules

    const level_end = Bodies.rectangle(map.widthInPixels, map.heightInPixels / 2, 32, map.heightInPixels, { isStatic: true, collides: true });

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels + 16, map.heightInPixels);

    //this.matter.world.createDebugGraphic();

    // The spawn point is set using a point object inside of Tiled (within the "Spawn" object layer)
    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    this.player = new Player(this, x, y);

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
  }

  onPlayerCollide({ gameObjectB }) {
    //if (!gameObjectB || !(gameObjectB instanceof Phaser.Tilemaps.Tile)) return;
    //if (gameObjectB == level_end) {
      //this.scene.start(Level2);
      //game.scene.load.script(Level2, "level 2.js");
    //}
    const tile = gameObjectB;

    // Check the tile property set in Tiled (you could also just check the index if you aren't using
    // Tiled in your game)
    /*if (tile.properties.level_end) {
      this.scene.start(Level2);
    }*/
  }

  update(time, delta) {
    // Runs once per frame for the duration of the scene
    //this.controls.update(delta);
  }
}

