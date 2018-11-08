import MultiKey from "./multi-key.js";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create the animations we need from the player spritesheet
    const anims = scene.anims;
    if(!anims.anims.entries["player-idle"]) {
      anims.create({
        key: "player-idle",
        frames: anims.generateFrameNumbers("player", { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }
    if(!anims.anims.entries["player-run"]) {
      anims.create({
        key: "player-run",
        frames: anims.generateFrameNumbers("player", { start: 8, end: 15 }),
        frameRate: 12,
        repeat: -1
      });
    }

    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, "player", 0);
    var drewThing = 1
    var drewThing2 = 2
    var drewThing3 = 2
    var drewThing4 = 2
    var airdashUsed = 0
    var startTimeL = new Date()
    var startTimeR = new Date()

    // The player's body is going to be a compound body that looks something like this:
    //
    //                  A = main body
    //
    //                   +---------+
    //                   |         |
    //                 +-+         +-+
    //       B = left  | |         | |  C = right
    //    wall sensor  |B|    A    |C|  wall sensor
    //                 | |         | |
    //                 +-+         +-+
    //                   |         |
    //                   +-+-----+-+
    //                     |  D  |
    //                     +-----+
    //
    //                D = ground sensor
    //
    // The main body is what collides with the world. The sensors are used to determine if the
    // player is blocked by a wall or standing on the ground.
    this.dead = false;
    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    const mainBody = Bodies.rectangle(0, 0, w * 0.6, h, { chamfer: { radius: 10 } });
    this.sensors = {
      bottom: Bodies.rectangle(0, h * 0.5, w * 0.6, 1, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.35, 0, 1, h * 0.5, { isSensor: true }),
      right: Bodies.rectangle(w * 0.35, 0, 1, h * 0.5, { isSensor: true })
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

    this.wall_jumps_enabled = false;
    this.double_jumps_enabled = false;
    this.air_dash_enabled = false;

    // Jumping is going to have a cooldown
    this.canJump = true;
    this.jumpCooldownTimer = null;

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
  
    // Track the keys
    const { LEFT, RIGHT, UP, A, D, W } = Phaser.Input.Keyboard.KeyCodes;
    this.leftInput = new MultiKey(scene, [LEFT, A]);
    this.rightInput = new MultiKey(scene, [RIGHT, D]);
    this.jumpInput = new MultiKey(scene, [UP, W]);

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
    //console.log(bodyB);
    if (bodyB.parent && bodyB.parent.gameObject && bodyB.parent.gameObject.texture && bodyB.parent.gameObject.texture.key == 'enemy 1') {
      if (bodyA === this.sensors.bottom) {
        bodyB.parent.gameObject.setVisible(false);
        bodyB.parent.destroy();
      } else if (bodyA === this.sensors.left || bodyA === this.sensors.right) {
        this.dead = true;
      }
    }
    if (bodyA === this.sensors.left) {
      if (!this.wall_jumps_enabled) {
        this.isTouching.left = true;
      } else {
        this.isTouching.ground = true;
      }
      if (!this.wall_jumps_enabled) {
        if (pair.separation > 0.1) this.sprite.x += pair.separation - 0.1;
      }
    } else if (bodyA === this.sensors.right) {
      if (!this.wall_jumps_enabled) {
        this.isTouching.right = true;
      } else {
        this.isTouching.ground = true;
      }
      if (!this.wall_jumps_enabled) {
        if (pair.separation > 0.1) this.sprite.x -= pair.separation - 0.1;
      }
    } else if (bodyA === this.sensors.bottom) {
      this.isTouching.ground = true;
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
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown = this.leftInput.isDown();
    const isJumpKeyDown = this.jumpInput.isDown();
    const isOnGround = this.isTouching.ground;
    const isInAir = !isOnGround;

    // --- Move the player horizontally ---

    // Adjust the movement so that the player is slower in the air
    const moveForce = isOnGround ? 0.0015 : 0.00075;

    if (isLeftKeyDown) {
      sprite.setFlipX(true);

      // Don't let the player push things left if they in the air
      if (!(isInAir && this.isTouching.left)) {
        sprite.applyForce({ x: -moveForce, y: 0 });
      }
    } else if (isRightKeyDown) {
      sprite.setFlipX(false);

      // Don't let the player push things right if they in the air
      if (!(isInAir && this.isTouching.right)) {
        sprite.applyForce({ x: moveForce, y: 0 });
      }
    }

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if(this.airdashUsed == 0){
      if (velocity.x > 1) sprite.setVelocityX(1);
      else if (velocity.x < -1) sprite.setVelocityX(-1);
    }
    else{
      if (velocity.x > 3) sprite.setVelocityX(3);
      else if (velocity.x < -3) sprite.setVelocityX(-3);
    }
    // --- Move the player vertically ---

    if (isJumpKeyDown && this.canJump && isOnGround) {
      sprite.setVelocityY(-11);

      // Add a slight delay between jumps since the bottom sensor will still collide for a few
      // frames after a jump is initiated
      this.canJump = false;
      this.jumpCooldownTimer = this.scene.time.addEvent({
        delay: 250,
        callback: () => (this.canJump = true)
      });
      this.drewThing2 = 1
    }

    if (isJumpKeyDown == false && this.drewThing2 == 1) {
      this.drewThing2 = 0
    }

    if (isJumpKeyDown && this.drewThing2 == 0 && this.drewThing == 1 && isOnGround == false) {
      this.drewThing = 0
      this.drewThing2 = 2
      sprite.setVelocityY(-11);

      // Add a slight delay between jumps since the bottom sensor will still collide for a few
      // frames after a jump is initiated
      this.canJump = false;
      this.jumpCooldownTimer = this.scene.time.addEvent({
        delay: 250,
        callback: () => (this.canJump = true)
      });
    }

    if (isLeftKeyDown && isOnGround == false && this.drewThing3 == 0 && this.drewThing == 1) {
      var endTime = new Date();
      if(endTime - this.startTimeL < 100) {
        this.drewThing2 = 2
        sprite.setVelocityX(-24)
        this.drewThing = 0
        this.airdashUsed = 1
      }
      else {
        this.startTimeL = new Date();
        this.drewThing3 = 1
      }
    }

    if (isLeftKeyDown && isOnGround == false && this.drewThing3 == 2 && this.drewThing == 1) {
      this.drewThing3 = 1
    }

    if (isLeftKeyDown == false && isOnGround == false && this.drewThing3 == 1 && this.drewThing == 1) {
      this.startTimeL = new Date();
      this.drewThing3 = 0
    }

    if (isRightKeyDown && isOnGround == false && this.drewThing4 == 0 && this.drewThing == 1) {
      var endTime = new Date();
      if(endTime - this.startTimeR < 100) {
        this.drewThing2 = 2
        sprite.setVelocityX(24)
        this.drewThing = 0
        this.airdashUsed = 1
      }
      else {
        this.startTimeR = new Date();
        this.drewThing4 = 1
      }
    }

    if (isRightKeyDown && isOnGround == false && this.drewThing4 == 2 && this.drewThing == 1) {
      this.drewThing4 = 1
    }

    if (isRightKeyDown == false && isOnGround == false && this.drewThing4 == 1 && this.drewThing == 1) {
      this.startTimeR = new Date();
      this.drewThing4 = 0
    }

    // Update the animation/texture based on the state of the player's state
    if (isOnGround) {
      if (sprite.body.force.x !== 0) sprite.anims.play("player-run", true);
      else sprite.anims.play("player-idle", true);
      this.drewThing = 1
      if (this.drewThing2 == 0)
      {
        this.drewThing2 = 2
      }
      this.drewThing3 = 2
      this.drewThing4 = 2
      this.airdashUsed = 0
    } else {
      sprite.anims.stop();
      sprite.setTexture("player", 10);
    }
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

    // Don't want any timers triggering post-mortem
    if (this.jumpCooldownTimer) this.jumpCooldownTimer.destroy();

    this.sprite.destroy();
  }
}
