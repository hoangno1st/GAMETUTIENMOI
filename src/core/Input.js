export class Input {
  constructor(target, pointerTarget, bindings) {
    this.target = target;
    this.pointerTarget = pointerTarget;
    this.bindings = bindings;
    this.keys = new Set();
    this.pressed = new Set();
    this.pointerAttackPressed = false;
    this.pointerClick = null;
    this.pointerScreenX = 0;
    this.pointerScreenY = 0;
    this.movementKeys = new Set(Object.values(bindings.movement).flat());
    this.actionKeys = new Set(Object.values(bindings.actions));

    this.onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!this.isBoundKey(event.code)) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      if (this.movementKeys.has(event.code)) this.keys.add(event.code);
    };

    this.onKeyUp = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!this.isBoundKey(event.code)) return;
      event.preventDefault();
      this.keys.delete(event.code);
    };

    this.onPointerDown = (event) => {
      if (event.button !== 0) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      event.preventDefault();
      this.pointerAttackPressed = true;
      const bounds = this.pointerTarget.getBoundingClientRect();
      this.pointerClick = {
        x: (event.clientX - bounds.left) * (this.pointerTarget.width / bounds.width),
        y: (event.clientY - bounds.top) * (this.pointerTarget.height / bounds.height),
      };
      this.pointerTarget.focus();
    };

    this.onPointerMove = (event) => {
      const bounds = this.pointerTarget.getBoundingClientRect();
      this.pointerScreenX = (event.clientX - bounds.left) * (this.pointerTarget.width / bounds.width);
      this.pointerScreenY = (event.clientY - bounds.top) * (this.pointerTarget.height / bounds.height);
    };

    this.onBlur = () => this.clear();
    this.target.addEventListener("keydown", this.onKeyDown, { passive: false });
    this.target.addEventListener("keyup", this.onKeyUp, { passive: false });
    this.pointerTarget.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    this.pointerTarget.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("blur", this.onBlur);
  }

  isBoundKey(code) {
    return this.movementKeys.has(code) || this.actionKeys.has(code);
  }

  isAnyDown(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  getMovementAxis() {
    const movement = this.bindings.movement;
    return {
      x: Number(this.isAnyDown(movement.right)) - Number(this.isAnyDown(movement.left)),
      y: Number(this.isAnyDown(movement.down)) - Number(this.isAnyDown(movement.up)),
    };
  }

  consumeAction(actionName) {
    const code = this.bindings.actions[actionName];
    if (!code || !this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumeBasicAttack() {
    const keyboardAttack = this.consumeAction("basicAttack");
    const requested = keyboardAttack || this.pointerAttackPressed;
    this.pointerAttackPressed = false;
    return requested;
  }

  consumePointerClick() {
    const click = this.pointerClick;
    this.pointerClick = null;
    return click;
  }

  getWorldMousePos(camera) {
    return {
      x: this.pointerScreenX + camera.renderX,
      y: this.pointerScreenY + camera.renderY,
    };
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.pointerAttackPressed = false;
    this.pointerClick = null;
  }
}
