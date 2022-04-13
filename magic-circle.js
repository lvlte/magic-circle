
class MagicCircle {

  _multiplier = 2;
  _modulus = 10;

  _mulStep = 0.005;
  _modStep = 0.05;

  // Default segment color for monochrome patterns
  _color = '#999999';               // lower-case hexadecimal notation only
  _colorPattern = 'segmentLength';  // @see input options below

  colorPalette = COLOR_WHEEL;

  // Radial axis
  axis = {
    display: true,
    offset: -Math.PI/2,     // angular offset
    origin: {
      x: 0,                 // -x offset
      y: 0                  // -y offset
    },
    color: '#555',
    label: {
      display: true,
      color: '#b8d0b2',
      room: 15,
      threshold: 7,         // don't display if actual fontSize goes below
      fontSize: 12,         // (size ref.) reduced as modulus increases
      fontFamily: 'Arial'
    }
  };

  controls = true;           // whether or not to create controls (DOM inputs).

  inputs = {
    // Create <input/> element if not told otherwise.
    // For each element, the id, name and value attributes are bound to the
    // corresponding (non-nested) _<parameter>, if any.
    colorPattern: {
      element: 'select',
      handler: 'colorHandler',
      label: 'color pattern',
      select: {
        options: [
          'monoFixed',
          'monoShifted',
          'segmentLength'
          // ...
          // leastFactor/primeness
        ]
      }
    },
    color: {
      label: false,
      input: {
        type: 'color'
      }
    },
    multiplier: {
      input: {
        type: 'range',
        min: 0,
        max: 3000
      }
    },
    modulus: {
      input: {
        type: 'range',
        min: 2,
        max: 3000
      }
    },
    mulStep: {
      bindTo: ['multiplier', 'step'],
      label: 'multiplier-step',
      input: {
        type: 'range',
        min: 0.005,
        max: 1,
        step: 0.005
      }
    },
    modStep: {
      bindTo: ['modulus', 'step'],
      label: 'modulus-step',
      input: {
        type: 'range',
        min: 0.05,
        max: 1,
        step: 0.05
      }
    }
  };

  animation = {
    paused: true
  };

  constructor (id, settings) {

    // Override defaults with passed-in settings if any.
    for (const prop in {id, ...settings}) {
      this[prop] = settings[prop];
    }

    const canvas = document.getElementById(id);
    canvas.width = Math.floor(windowWidth());
    canvas.height = Math.floor(windowHeight());

    this.radius = Math.floor(Math.min(canvas.width, canvas.height) / 2.5);
    this.diameter = 2*this.radius;

    this.centerX = Math.floor(canvas.width / 2);
    this.centerY = Math.floor(canvas.height / 2);

    this.ctx = canvas.getContext('2d');

    if (this.controls) {
      this.addControls();
    }
  }

  set multiplier(value) {
    if (!this.updateInput('multiplier', value)) {
      this._multiplier = value;
    }
  }

  get multiplier() {
    return this._multiplier;
  }

  set modulus(value) {
    if (!this.updateInput('modulus', value)) {
      this._modulus = value;
    }
  }

  get modulus() {
    return this._modulus;
  }

  set mulStep(value) {
    if (!this.updateInput('mulStep', value)) {
      this._mulStep = value;
    }
  }

  get mulStep() {
    return this._mulStep;
  }

  set modStep(value) {
    if (!this.updateInput('modStep', value)) {
      this._modStep = value;
    }
  }

  get modStep() {
    return this._modStep;
  }

  set color(value) {
    if (!this.updateInput('color', value)) {
      this._color = value;
    }
  }

  get color() {
    return this._color;
  }

  set colorPattern(value) {
    if (!this.updateInput('colorPattern', value)) {
      this._colorPattern = value;
    }
  }

  get colorPattern() {
    return this._colorPattern;
  }

  updateInput(param, value) {
    const element = document.getElementById(param);
    if (!element) {
      return false;
    }
    element.value = value;
    element.dispatchEvent(new Event('input'));
    return true;
  }

  clearCan() {
    this.translateTo(0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  render() {
    this.clearCan();
    this.setAxis();
    this.drawSegments();
  }

  translateTo(x, y) {
    const dx = x - this.axis.origin.x;
    const dy = y - this.axis.origin.y;

    this.axis.origin.x = x;
    this.axis.origin.y = y;

    this.ctx.translate(dx, dy);
  }

  setPoints() {
    const modAng = 2*Math.PI/this.modulus;
    let angle = this.axis.offset;
    this.points = [];

    for (let n=0; n<this.modulus; n++) {
      this.points.push({
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      });

      angle += modAng;
    }
  }

  setAxis() {
    this.setPoints();

    if (!this.axis.display && !this.axis.label.display)
      return;

    this.translateTo(this.centerX, this.centerY);

    if (this.axis.display)
      this.drawCircle();

    if (this.axis.label.display) {
      const fontSize = this.labelFontSize();

      if (fontSize < this.axis.label.threshold)
        return;

      for (let n=0; n<this.modulus; n++) {
        const ptLabel = {
          x: this.points[n].x * 1.1,
          y: this.points[n].y * 1.1
        };
        this.drawAxisLabel(ptLabel, n, fontSize);
      }
    }
  }

  labelFontSize() {
    const distH = Math.abs(this.points[0].x - this.points[1].x);
    const distV = Math.abs(this.points[0].y - this.points[1].y);
    const distance = Math.hypot(distH, distV) - this.axis.label.room;

    if (this.axis.label.fontSize > distance)
      return distance;

    return this.axis.label.fontSize;
  }


  drawAxisLabel(point, label, fontSize) {
    const ctx = this.ctx;

    ctx.font = fontSize + 'px ' + this.axis.label.fontFamily;
    ctx.fillStyle = this.axis.label.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(label, point.x, point.y);
  }

  drawSegments() {
    const points = this.points;
    const modAng = 2*Math.PI/this.modulus;

    this.translateTo(this.centerX, this.centerY);

    for (let n=1; n<points.length; n++) {
      const m = (n * this.multiplier) % this.modulus;

      const a = points[n];
      const b = Math.floor(m) === m ? points[m] : {
        x: Math.cos(m * modAng + this.axis.offset) * this.radius,
        y: Math.sin(m * modAng + this.axis.offset) * this.radius
      };

      const color = this.segmentColor(n, m, a, b);
      this.drawLine(a.x, a.y, b.x, b.y, color);
    }
  }

  segmentColor(n, m, a, b) {
    switch (this.colorPattern) {
      case 'monoFixed':
      case 'monoShifted':
      default:
        return this.color;

      case 'segmentLength': {
        if (this.colorPalette.length < 2) {
          return this.colorPalette[0] ?? this.color;
        }

        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        // This is to prevent rounding issues
        const len = Math.min(this.diameter-1, Math.hypot(dx, dy));

        const intervals = this.colorPalette.length - 1;
        const cx = len*intervals / this.diameter;

        // Expanding the curve of f(len)=color
        const ecx = cx*Math.sqrt(cx/intervals);

        const [i1, i2] = [Math.floor(ecx), Math.ceil(ecx)];
        const [rgb1, rgb2] = [this.colorPalette[i1], this.colorPalette[i2]];

        const r = ecx - i1;
        const rgb = rgb1.map((c, i) => Math.round(c + r*(rgb2[i]-c)) );

        return rgb2hex(rgb);
      }
    }
  }

  colorShift() {
    if (!this._colorTarget || this._colorTarget === this.color) {
      this.colorTransition();
    }

    const { step, current } = this._colorTrans;
    ['r', 'g', 'b'].forEach((c, i) => current[i] += step[i]);

    this.color = rgb2hex(current.map(Math.round));
  }

  colorTransition() {
    this._colorTarget = randomColor();

    const [from, to] = [hex2rgb(this.color), hex2rgb(this._colorTarget)];
    const dist = from.map((c, i) => to[i] - c);

    const n = 300; // ~= 60fps * 5s
    const step = dist.map(d => d / n);

    this._colorTrans = { from, to, step, current: [...from] };
  }

  drawCircle() {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, 2*Math.PI);

    ctx.strokeStyle = this.axis.color;
    ctx.stroke();
  }

  drawLine(x1, y1, x2, y2, color) {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.strokeStyle = color;
    ctx.stroke();
  }

  addControls() {
    const me = this;
    const ctrl = document.getElementById('controls');
    const form = document.createElement('form');

    // Elements for which the parameter requires an 'input' event for init.
    const toInit = [];
    for (const param in me.inputs) {
      me.createInput(form, param, toInit);
    }

    ctrl.appendChild(form);
    toInit.forEach(input => input.dispatchEvent(new Event('input', {})));

    me.addControls = () => 'no-op'; // prevent further execution.
  }

  displayControls(display=true) {
    const ctrl = document.getElementById('controls');
    if (!display) {
      ctrl.style.display = 'none';
    }
    else {
      this.addControls();
      ctrl.style.display = 'block';
    }
  }

  createInput(form, param, toInit) {
    const me = this;
    const element = me.inputs[param].element ?? 'input';

    const value = me[param] ?? me.inputs[param][element].value;
    const input = document.createElement(element);
    const props = me.inputs[param][element];

    for (const name in props) {
      if (name === 'options' && element === 'select') {
        props[name].forEach(option => {
          const opt = document.createElement('option');
          opt.value = option;
          opt.text = option;
          if (option === value) {
            opt.selected = true;
          }
          input.add(opt);
        });
        continue;
      }
      input.setAttribute(name, props[name]);
    }

    input.setAttribute('id', param);
    input.setAttribute('name', param);
    input.setAttribute(me.inputs[param].valueAttr ?? 'value', value);

    // Bindings
    input.addEventListener('input', function (event) {
      me.inputHandler.apply(me, [this, param, event]);
    });

    if (me.inputs[param].bindTo) {
      toInit.push(input);
    }

    if (me.inputs[param].handler) {
      toInit.push(input);
    }

    const div = document.createElement('div');
    div.classList.add('parameter', param);

    if (me.inputs[param].label ?? true) {
      const label = document.createElement('label');
      const txt = document.createTextNode(me.inputs[param].label ?? param);
      label.setAttribute('for', param);
      label.appendChild(txt);
      div.appendChild(label);
    }

    div.appendChild(input);

    if (props.type === 'range') {
      // Display actual value
      const output = document.createElement('output');
      output.setAttribute('name', param + '-output');
      output.setAttribute('for', param);
      output.value = value;
      div.appendChild(output);
    }

    form.appendChild(div);
  }

  inputHandler(input, param) {
    const value = Number.isNaN(input.valueAsNumber ?? NaN) ?
            input.value : input.valueAsNumber;

    const field = '_' + param;
    if (field in this) {
      this[field] = value;
    }

    if (this.inputs[param].bindTo) {
      const [id, attr] = this.inputs[param].bindTo;
      document.getElementById(id).setAttribute(attr, value);
    }

    if (this.inputs[param].handler) {
      this[this.inputs[param].handler](input, param, value);
    }

    if (input.type === 'range')
      input.nextElementSibling.value = value;

    if (this.animation.paused)
      this.render();
  }

  colorHandler(el, param, pattern) {
    // Hide picker for non-monochrome patterns
    const picker = document.getElementsByClassName('color')[0];
    picker.style.display = pattern.startsWith('mono') ? 'inline-block' : 'none';
  }

  toggleAnimation() {
    this.animation.paused = !this.animation.paused;
    if (!this.animation.paused) {
      this.animate();
    }
  }

  animate() {
    const me = this;

    // eslint-disable-next-line no-constant-condition
    if (true || me.inputs.multiplier.toggle) {
      me.multiplier += me.mulStep;
    }

    // eslint-disable-next-line no-constant-condition
    if (true || me.inputs.modulus.toggle) {
      me.modulus += me.modStep;
    }

    if (me.colorPattern === 'monoShifted') {
      me.colorShift();
    }

    me.render();

    if (me.animation.paused)
      return;

    requestAnimationFrame(me.animate.bind(me));
  }

}

/**
 * Helper/utils functions
 */

function windowWidth () {
  return window.innerWidth ||
          document.documentElement.clientWidth ||
          document.body.clientWidth;
}

function windowHeight () {
  return window.innerHeight ||
          document.documentElement.clientHeight ||
          document.body && document.body.clientHeight;
}

function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

function rgb2hex(rgb) {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

function hex2rgb(hex) {
  return hex.slice(1).match(/.{2}/g).map(c => parseInt(c, 16));
}


window.requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame || window.msRequestAnimationFrame;

/**
 * Color Palettes
 */

// Hues
const COLOR_WHEEL = [
  [255,   0, 255],  // magenta
  [127,   0, 255],  // blueMagenta
  [  0,   0, 255],  // blue
  [  0, 127, 255],  // blueCyan
  [  0, 255, 255],  // cyan
  [  0, 255, 127],  // greenCyan
  [  0, 255,   0],  // green
  [127, 255,   0],  // greenYellow
  [255, 255,   0],  // yellow
  [255, 127,   0],  // orange
  [255,   0,   0],  // red
  [255,   0, 127],  // redMagenta
];


// Testing ..

document.addEventListener('DOMContentLoaded', function() {
  const mc = new MagicCircle('f-canvas', {
    multiplier: 0,
    controls: false,
  });

  window.mc = mc;
  console.log('MagicCircle', mc);

  mc.render();

  mc.ctx.canvas.addEventListener('click', mc.toggleAnimation.bind(mc));
});




