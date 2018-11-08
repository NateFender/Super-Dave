import MultiKey from "./multi-key.js";

export default class Enemy_1 {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create the animations we need from the player spritesheet
    const anims = scene.anims;
    if(!anims.anims.entries["enemy 1 idle"]) {
      anims.create({
        key: "enemy 1 idle",
        frames: anims.generateFrameNumbers("enemy 1", { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }
    if(!anims.anims.entries["enemy 1 walk"]) {
      anims.create({
        key: "enemy 1 walk",
        frames: anims.generateFrameNumbers("enemy 1", { start: 8, end: 15 }),
        frameRate: 12,
        repeat: -1
      });
    }

    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, "enemy 1", 0);
    this.sprite.anims.play("enemy 1 idle", true);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    const mainBody = Bodies.rectangle(0, 0, w * 0.6, h, { chamfer: { radius: 10 } });
    this.sensors = {
      bottom: Bodies.rectangle(0, h * 0.5, w * 0.6, 1, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.35, 0, 1, h * 0.5, { isSensor: true }),
      right: Bodies.rectangle(w * 0.35, 0, 1, h * 0.5, { isSensor: true }),
      top: Bodies.rectangle(0, -h * 0.5, w * 0.6, 1, { isSensor: true }),
    };
    const compoundBody = Body.create({
      parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
      frictionStatic: 0,
      frictionAir: 0.02,
      friction: 0.1
    });
    this.sprite
      .setExistingBody(compoundBody)
      .setScale(2)
      .setFixedRotation() // Sets inertia to infinity so the player can't rotate
      .setPosition(x, y);

    // Track which sensors are touching something
    this.isTouching = { left: false, right: false, ground: false };

    // Before matter's update, reset our record of which surfaces the player is touching.
    scene.matter.world.on("beforeupdate", this.resetTouching, this);
   
    scene.matterCollision.addOnCollideStart({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });

    this.scene.events.on("update", this.update, this);
    this.destroyed = false;
    this.scene.events.on("update", this.update, this);
    this.scene.events.once("shutdown", this.destroy, this);
    this.scene.events.once("destroy", this.destroy, this);
  }
  
  onSensorCollide({ bodyA, bodyB, pair }) {
    // Watch for the player colliding with walls/objects on either side and the ground below, so
    // that we can use that logic inside of update to move the player.
    // Note: we are using the "pair.separation" here. That number tells us how much bodyA and bodyB
    // overlap. We want to teleport the sprite away from walls just enough so that the player won't
    // be able to press up against the wall and use friction to hang in midair. This formula leaves
    // 0.5px of overlap with the sensor so that the sensor will stay colliding on the next tick if
    // the player doesn't move.

    // this.isTouching.left, this.isTouching.right, and the if statements governing pair.separation all
    //   govern wall collisions and need to be enabled for the game to prevent "wall sticking." 
    //   Touching a wall needs to enable this.isTouching.ground to allow players to jump off the wall. 
    //if (bodyB.isSensor) return; // We only care about collisions with physical objects

    if (bodyB.gameObject && bodyB.gameObject.texture && bodyB.gameObject.texture.key == 'enemy 1') {
      if (bodyA === this.sensors.bottom) {
        console.log("bottom");
        bodyB.destroy();
      } else if (bodyA === this.sensors.left || bodyA === this.sensors.right) {
        console.log("side");
      }
    }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
  }

  freeze() {
    this.sprite.setStatic(true);
  }

  update() {
    if (this.destroyed) return;

    const sprite = this.sprite;
    const velocity = sprite.body.velocity;

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if (velocity.x > 3) sprite.setVelocityX(3);
    else if (velocity.x < -3) sprite.setVelocityX(-3);
  }
  destroy() {
    this.destroyed = true;

    // Event listeners
    this.scene.events.off("update", this.update, this);
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
    if (this.scene.matter.world) {
      this.scene.matter.world.off("beforeupdate", this.resetTouching, this);
    }

    // Matter collision plugin
    const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right];
    this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
    this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });

    //this.gameObject.setVisible(false);
    //this.sprite.destroy();
  }
}
