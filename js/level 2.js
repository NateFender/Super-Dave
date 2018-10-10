//import Player from "./player.js";

export default class Level2 extends Phaser.Scene {
  preload() {
    // Runs once, loads up assets like images and audio
    this.load.image("level 1-2 tileset", "../assets/tilesets/level 1 tileset.png");
    this.load.tilemapTiledJSON("map", "../assets/tilemaps/level 2.json");
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

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    //this.matter.world.createDebugGraphic();
    
    //Emoji stuff from the example
    // Create a physics-enabled image
    /*const image1 = this.matter.add.image(275, 100, "emoji", "1f92c");
    // Change it's body to a circle and configure its body parameters
    image1.setCircle(image1.width / 2, { restitution: 1, friction: 0.25 });
    image1.setScale(0.5);

    const image2 = this.matter.add.image(300, 75, "emoji", "1f60d");
    image2.setCircle(image2.width / 2, { restitution: 1, friction: 0.25 });
    image2.setScale(0.5);

    // We can also pass in our Matter body options directly into to this.matter.add.image, along with
    // a Phaser "shape" property for controlling the type & size of the body
    const image3 = this.matter.add
      .image(325, 100, "emoji", "1f4a9", { restitution: 1, friction: 0, shape: "circle" })
      .setScale(0.5);

    // To randomize which emoji we'll use, we'll grab all the atlas's frame names
    const frameNames = Object.keys(this.cache.json.get("emoji").frames);

    this.input.on("pointerdown", () => {
      const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
      for (let i = 0; i < 4; i++) {
        const x = worldPoint.x + Phaser.Math.RND.integerInRange(-10, 10);
        const y = worldPoint.y + Phaser.Math.RND.integerInRange(-10, 10);
        const frame = Phaser.Utils.Array.GetRandom(frameNames);
        this.matter.add
          .image(x, y, "emoji", frame, { restitution: 1, friction: 0, shape: "circle" })
          .setScale(0.5);
      }
    });
    //End emoji stuff*/

    //Camera stuff from tutorial 4
    /*this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const cursors = this.input.keyboard.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: 0.5
    };
    this.controls = new Phaser.Cameras.Controls.FixedKeyControl(controlConfig);

    const text = 'Left-click to emoji.\nArrows to scroll.\nPress "D" to see Matter bodies.';
    const help = this.add.text(16, 16, text, {
      fontSize: "18px",
      padding: { x: 10, y: 5 },
      backgroundColor: "#ffffff",
      fill: "#000000"
    });
    help.setScrollFactor(0).setDepth(1000);
    //End camera stuff*/

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
    
  }

  update(time, delta) {
    // Runs once per frame for the duration of the scene
    //this.controls.update(delta);
  }
}
