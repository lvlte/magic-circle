
class MagicCircle {

  // These _fields (beginning with underscore) have getters/setters, they are
  // bound to their respective input elements if any (when controls == true).

  _multiplier = 2;
  _modulus = 10;

  _mulStep = 0.005;
  _modStep = 0.05;

  // Default segment color for monochrome patterns
  _color = '#999999';               // lower-case hexadecimal notation only
  _colorPattern = 'segmentLength';  // @see input options below

  colorPalettes = COLOR_PALETTES;
  paletteVariants = false;           // whether to create palette variants

  // Selected palette
  _colorPalette = Object.keys(this.colorPalettes)[0];

  // Radial axis
  axis = {
    display: true,
    offset: {
      θ: -Math.PI/2,        // angular offset
      x: 0,
      y: 0
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
      handler: 'colorPatternHandler',
      label: 'color pattern',
      select: {
        options: [
          'monoFixed',
          'monoShifted',
          'segmentLength',
          'leastPrimeFactor'
        ]
      }
    },
    color: {
      label: false,
      input: {
        type: 'color'
      }
    },
    colorPalette: {
      element: 'select',
      label: 'color palette',
      select: {
        options: Object.keys(this.colorPalettes)
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
        min: 1,
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

  // Track the last input timestamp;
  #inputTimeStamp = 0;

  // Canvas origin
  #origin = { x: 0, y: 0 };


  constructor (id, settings) {
    this.id = id;

    // Proxying _fields via getters/setters dynamically.
    for (const field in this) {
      if (field[0] != '_')
        continue;

      const param = field.slice(1);
      const modifier = param === 'multiplier' || param === 'modulus' ?
              (value) => value = Math.round(value * 1000) / 1000 : undefined;

      this.defineProxyField(field, param, modifier);
    }

    // Override defaults with passed-in settings if any.
    merge(this, settings);

    const canvas = document.getElementById(id);
    this.ctx = canvas.getContext('2d');

    if (this.paletteVariants) {
      const palettes = this.colorPalettes;
      const variants = {};
      for (const pal in palettes) {
        for (let i=0; i<palettes[pal].length; i++) {
          variants[`${pal}_${i}`] = rotate([...palettes[pal]], i, true);
        }
      }
      this.colorPalettes = variants;
      if (this.inputs.colorPalette.select) {
        this.inputs.colorPalette.select.options = Object.keys(variants);
      }
      if (!(this.colorPalette in this.colorPalettes)) {
        this.colorPalette += '_0';
      }
    }

    // Create custom lpf palette if not already done (via settings).
    if (!this.lpfPalette) {
      this.lpfPalette = this.lpfGenPalette();
    }

    if (this.controls) {
      this.addControls();
    }

    this.initAxis();
    window.addEventListener('resize', this.initAxis.bind(this));
  }

  defineProxyField(field, param, modifier) {
    const setter = function(value) {
      if (!this.updateInput(param, value)) {
        this[field] = value;
      }
    };
    Object.defineProperty(this, param, {
      get() { return this[field] },
      set: !modifier ? setter : function(value) {
        setter.call(this, modifier(value));
      }
    });
  }

  initAxis () {
    const can = this.ctx.canvas;
    can.width = Math.floor(windowWidth());
    can.height = Math.floor(windowHeight());

    this.radius = Math.floor(Math.min(can.width, can.height) / 2.5);
    this.diameter = 2*this.radius;

    this.axis.cx = Math.floor(can.width/2 + this.axis.offset.x);
    this.axis.cy = Math.floor(can.height/2 + this.axis.offset.y);

    this.#origin.x = 0;
    this.#origin.y = 0;

    if (this.animation.paused) {
      this.render();
    }
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
    const dx = x - this.#origin.x;
    const dy = y - this.#origin.y;

    this.#origin.x = x;
    this.#origin.y = y;

    this.ctx.translate(dx, dy);
  }

  setPoints() {
    const modAng = 2*Math.PI/this.modulus;
    let angle = this.axis.offset.θ;
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

    this.translateTo(this.axis.cx, this.axis.cy);

    if (this.axis.display)
      this.drawCircle();

    if (this.axis.label.display && this.modulus > 1) {
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

    this.translateTo(this.axis.cx, this.axis.cy);

    for (let n=1; n<points.length; n++) {
      const m = (n * this.multiplier) % this.modulus;

      const a = points[n];
      const b = Math.floor(m) === m ? points[m] : {
        x: Math.cos(m * modAng + this.axis.offset.θ) * this.radius,
        y: Math.sin(m * modAng + this.axis.offset.θ) * this.radius
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
        const palette = this.colorPalettes[this.colorPalette];
        if (palette.length < 2) {
          return palette[0] ?? this.color;
        }

        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        // This is to prevent rounding issues
        const len = Math.min(this.diameter-1, Math.hypot(dx, dy));

        const intervals = palette.length - 1;
        const cx = len*intervals / this.diameter;

        // Expanding the curve of f(len)=color
        // const ecx = palette.length**(cx/intervals) - 1; // exponential
        const ecx = cx*Math.sqrt(cx/intervals);         // gentle exp
        // const ecx = cx;                                 // linear

        const [i1, i2] = [Math.floor(ecx), Math.ceil(ecx)];
        const [rgb1, rgb2] = [palette[i1], palette[i2]];

        const r = ecx - i1;
        const rgb = rgb1.map((c, i) => Math.round(c + r*(rgb2[i]-c)) );

        return rgb2hex(rgb);
      }

      case 'leastPrimeFactor': {
        return this.lpfPalette[n];
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
      me.inputs[param] && me.createInput(form, param, toInit);
    }

    ctrl.appendChild(form);
    toInit.forEach(input => input.dispatchEvent(new Event('input')));

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

    if (me.inputs[param].bindTo || me.inputs[param].handler) {
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

    const toggle = {range: 'number', number: 'range'};
    if (props.type in toggle) {
      // Display actual value for range input (create the output element in both
      // cases as we allow to switch from one to the other).
      const output = document.createElement('output');
      output.setAttribute('name', param + '-output');
      output.setAttribute('for', param);
      output.value = value;
      output.style.display = props.type === 'range' ? 'block' : 'none';
      div.appendChild(output);
      div.addEventListener('dblclick', function(event) {
        if (me.animation.paused && event.timeStamp - me.#inputTimeStamp < 200)
          return;
        const type = toggle[input.getAttribute('type')];
        input.setAttribute('type', type);
        output.style.display = type === 'range' ? 'block' : 'none';
      });
    }

    form.appendChild(div);
  }

  inputHandler(input, param, event) {
    this.#inputTimeStamp = event.timeStamp;

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

    if (input.type === 'range' || input.type === 'number')
      input.nextElementSibling.value = value;

    if (this.animation.paused)
      this.render();
  }

  colorPatternHandler(input, param, pattern) {
    // Hide picker for non-monochrome patterns.
    const picker = document.getElementsByClassName('color')[0];
    if (picker) {
      if (pattern.startsWith('mono')) {
        picker.style.display = 'inline-block';
        input.classList.add('short');
      }
      else {
        picker.style.display = 'none';
        input.classList.remove('short');
      }
    }

    // Show palette selector only for segmentLength pattern.
    const selector = document.getElementsByClassName('colorPalette')[0];
    if (selector) {
      selector.style.display = pattern === 'segmentLength' ? 'block' : 'none';
    }

  }

  lpfGenPalette() {
    const len = this.inputs.modulus.input.max;
    const colors = rotate([...COLOR_PALETTES.triadic], 4);
    const pal = Array(len);

    const fillpal = (n, color) => {
      const step = n;
      do if (!pal[n]) pal[n] = color;
      while ((n+=step) < len);
    };

    pal[1] = '#000000';
    fillpal(2, '#555555');

    let n = 3;
    for (n; colors.length; n+=2) {
      fillpal(n, rgb2hex(colors.shift()));
    }
    for (n; n<len; n+=2) {
      fillpal(n, randomColor());
    }

    return pal;
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

function rotate(array, r=1, rev=false) {
  if (array.length < 2 || r < 1)
    return array;

  const f = rev ? () => {
    array.unshift(array.pop());
    return array;
  } : () => {
    array.push(array.shift());
    return array;
  };

  do f(array, rev, r--)
  while (r > 0);

  return array;
}

function type(obj) {
  return Object.prototype.toString.call(obj).slice(8,-1);
}

function isObject(obj) {
  return type(obj) === 'Object';
}

function merge(target, source) {
  for (const key in source) {
    if (isObject(target[key]) && isObject(source[key]))
      merge(target[key], source[key]);
    else
      target[key] = source[key];
  }
  return target;
}

window.requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame || window.msRequestAnimationFrame;

/**
 * Color Palettes
 */

const COLOR_PALETTES = {

  // Hues
  color_wheel: [
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
  ],

  // Monochrome Combinations

  mono_ocean: [
    [141, 176, 198],
    [ 95, 136, 165],
    [205, 212, 212],
    [ 50,  65,  98],
    [109, 113, 186]
  ],

  // Complementary combinations

  dyadic: [
    [160,  25,  16],
    [229, 113,  75],
    [ 29,  73, 101],
    [ 47, 164, 168],
    [190,  78,  50],
  ],

  triadic: [
    [242, 179,   7],
    [163,  42,  36],
    [ 17, 148, 143],
    [ 45,  94, 116],
    [190,  78,  50]
  ],

  triadic_split: [
    [172,  90,  86],
    [224, 196,  78],
    [190, 159, 122],
    [ 76, 132,  68],
    [219, 125, 141]
  ]

}



// Testing ..

document.addEventListener('DOMContentLoaded', function() {
  const mc = new MagicCircle('f-canvas', {
    multiplier: 2,
    modulus: 10,
    controls: true,
    paletteVariants: true,
    colorPattern: 'leastPrimeFactor',
    colorPalette: 'dyadic_1',
    // axis: {offset: {x: -150}}
  });

  window.mc = mc;
  console.log('MagicCircle', mc);

  mc.render();

  mc.ctx.canvas.addEventListener('click', mc.toggleAnimation.bind(mc));
});




