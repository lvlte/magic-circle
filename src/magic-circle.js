
class MagicCircle {

  colorPalettes = COLOR_PALETTES;
  paletteVariants = false;          // whether to create palette variants
  lpfPalette;                       // custom palette for lpf color pattern

  // #p[rivate] fields have getters/setters which are also bound to their
  // respective input elements if any (when controls == true).
  #p = {
    multiplier: 2,
    modulus: 10,

    mulStep: 0.005,
    modStep: 0.05,

    colorPattern: 'segmentLength',  // see input options below

    // Default segment color for monochrome patterns (lower-case hexadecimal)
    color: '#999999',

    // For leastPrimeFactor pattern, filters those n having their lpf in common.
    lpfFilter: 2,                   // if controls=false, set 0 to disable.

    // Selected palette
    colorPalette: Object.keys(this.colorPalettes)[0],

    // Animation scale (-/+ = backward/forward, magnitude = speed).
    animScale: 1
  };

  // Keeps track of the canvas origin coords
  #origin = {
    x: 0,
    y: 0
  };

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
      color: '#333',
      room: 15,
      threshold: 7,         // don't display if actual fontSize goes below
      fontSize: 12,         // (size ref.) reduced as modulus increases
      fontFamily: 'Arial'
    }
  };

  controls = true;          // whether or not to create controls (DOM inputs)

  inputs = {
    // Create <input/> element if not told otherwise via 'element' property.
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
    lpfFilter: {
      toggle: 'Filter on/off',
      disabled: true,
      input: {
        type: 'number',
        min: 2,
        max: 50,
        step: 1
      }
    },
    multiplier: {
      toggle: 'Animate',
      input: {
        type: 'range',
        min: 0,
        max: 3000
      }
    },
    modulus: {
      toggle: 'Animate',
      input: {
        type: 'range',
        min: 1,
        max: 3000
      }
    },
    mulStep: {
      handler: 'stepHandler',
      label: 'multiplier-step',
      input: {
        type: 'range',
        min: 0.005,
        max: 1,
        step: 0.005
      }
    },
    modStep: {
      handler: 'stepHandler',
      label: 'modulus-step',
      input: {
        type: 'range',
        min: 0.005,
        max: 1,
        step: 0.005
      }
    },
    animScale: {
      handler: 'animScaleHandler',
      label: 'anim-scale',
      input: {
        type: 'range',
        min: -5,
        max: 5,
        step: 0.25
      }
    }
  };

  animation = {
    paused: true,
    hooks: {
      multiplierAnim: function() {
        if (this.multiplierToggle ?? true) {
          this.multiplier += this.mulStep * this.animScale;
        }
      },
      modulusAnim: function() {
        if (this.modulusToggle ?? true) {
          this.modulus += this.modStep * this.animScale;
        }
      }
    }
  };

  constructor(id, settings) {
    this.id = id;

    // Proxying #private fields via getters/setters dynamically.
    for (const field in this.#p) {
      const modifier = field === 'multiplier' || field === 'modulus' ?
              (value) => Math.round(value * 100000) / 100000 : undefined;
      this.defineProxyField(field, modifier);
    }

    // Override defaults with passed-in settings if any.
    Utils.merge(this, settings);

    const canvas = document.createElement('canvas');
    this.wrapper = document.getElementById(id);
    this.wrapper.append(canvas);

    this.wrapper.classList.add('mc-wrapper');

    this.ctx = canvas.getContext('2d');

    if (this.paletteVariants) {
      const variants = MagicCircle.colorPaletteVariants(this.colorPalettes);
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
      const len = this.inputs.modulus.input.max;
      this.lpfPalette = MagicCircle.lpfGenPalette(len);
    }

    if (this.controls) {
      this.createControls();
      this.displayControls(true);
    }

    this.setLayout();
    window.addEventListener('resize', this.setLayout.bind(this));

    if (this.animation.paused === false) {
      this.animate();
    }

    canvas.addEventListener('click', this.toggleAnimation.bind(this));
  }

  defineProxyField(field, modifier) {
    const setter = function(value) {
      if (!this.updateInput(field, value)) {
        this.#p[field] = value;
      }
    };
    Object.defineProperty(this, field, {
      get() {
        return this.#p[field];
      },
      set: !modifier ? setter : function(value) {
        setter.call(this, modifier(value));
      }
    });
  }

  setLayout() {
    const can = this.ctx.canvas;
    const box = this.wrapper;

    const ctrl = document.getElementById('controls');
    const ctrlCS = ctrl && getComputedStyle(ctrl);

    const winW = Math.floor(Utils.windowWidth());
    const winH = Math.floor(Utils.windowHeight()) - 5;

    let size = Math.min(box.clientWidth, winW, box.clientHeight - 5, winH);
    can.width = size;
    can.height = size;

    // flex-wrap flag
    let stacked = false;

    if (ctrl && !(ctrlCS?.position in {absolute: 1, fixed: 1})) {
      const hidden = ctrl.classList.contains('collapsed');
      if (!hidden && ctrl.offsetLeft < can.offsetLeft + can.offsetWidth) {
        const minW = Math.min(size, box.clientWidth - 5 - ctrl.offsetWidth);
        const minH = Math.min(size, box.clientHeight - 5 - ctrl.offsetHeight);
        size = Math.max(minW, minH);
        can.height = size;
        can.width = size;
      }
      stacked = ctrl.offsetLeft < can.offsetLeft + can.offsetWidth;
    }

    stacked ? box.classList.add('stacked') : box.classList.remove('stacked');

    this.setAxis();
  }

  setAxis() {
    const can = this.ctx.canvas;

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

  clearCan() {
    this.translateTo(0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  render() {
    this.clearCan();
    this.drawAxis();
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

  drawAxis() {
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
    if (Number.isNaN(this.multiplier))
      return;

    const points = this.points;
    const modAng = 2*Math.PI/this.modulus;

    this.translateTo(this.axis.cx, this.axis.cy);

    for (let n=1; n<points.length; n++) {
      const m = (n * this.multiplier) % this.modulus;
      const angle = m * modAng + this.axis.offset.θ;

      const a = points[n];
      const b = Math.floor(m) === m ? points[m] : {
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      };

      const color = this.segmentColor(n, m, a, b);
      if (color === false)
        continue;

      this.drawLine(a.x, a.y, b.x, b.y, color);
    }
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

  segmentColor(n, m, a, b) {
    switch (this.colorPattern) {
      case 'monoFixed':
      case 'monoShifted':
      default:
        return this.color;

      case 'segmentLength': {
        const palette = this.colorPalettes[this.colorPalette];
        if (palette.length < 2)
          return palette[0] ?? this.color;

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

        return Utils.rgb2hex(rgb);
      }

      case 'leastPrimeFactor': {
        if ((this.lpfFilterToggle ?? true) && this.lpfFilter) {
          const color = this.lpfPalette[this.lpfFilter];
          return this.lpfPalette[n] === color ? color : false;
        }
        return this.lpfPalette[n];
      }
    }
  }

  colorShift() {
    if (!this._colorTarget || this._colorTarget === this.color) {
      this.colorTransition();
    }

    const {step, current} = this._colorTrans;
    ['r', 'g', 'b'].forEach((c, i) => current[i] += step[i]);

    this.color = Utils.rgb2hex(current.map(Math.round));
  }

  colorTransition() {
    this._colorTarget = Utils.randomColor();

    const from = Utils.hex2rgb(this.color);
    const to = Utils.hex2rgb(this._colorTarget);
    const dist = from.map((c, i) => to[i] - c);

    const n = 300; // ~= 60fps * 5s
    const step = dist.map(d => d / n);

    this._colorTrans = {from, to, step, current: [...from]};
  }

  createControls() {
    const me = this;

    const wrapper = document.createElement('div');
    const ctrl = document.createElement('div');
    const displayToggle = document.createElement('div');

    wrapper.setAttribute('id', 'controls');
    ctrl.setAttribute('id', 'ctrl-inputs');
    displayToggle.setAttribute('id', 'ctrl-toggle');
    displayToggle.setAttribute('title', 'Show/Hide Controls');

    wrapper.append(ctrl, displayToggle);
    this.wrapper.append(wrapper);

    const toInit = [];
    for (const param in me.inputs) {
      if (me.inputs[param]) {
        ctrl.appendChild(me.createInput(param, toInit));
      }
    }

    toInit.forEach(input => {
      input.dispatchEvent(new CustomEvent('input', {detail: 'init'}));
    });

    displayToggle.addEventListener('click', function() {
      me.displayControls(wrapper.classList.contains('collapsed'));
      me.setLayout();
    });

    me.createControls = () => 'no-op'; // prevent further execution.
  }

  displayControls(display=true) {
    const ctrl = document.getElementById('controls');
    ctrl.classList[display ? 'remove' : 'add']('collapsed');
  }

  createInput(param, toInit) {
    const me = this;
    const element = me.inputs[param].element ?? 'input';

    const value = me[param] ?? me.inputs[param][element].value;
    const input = document.createElement(element);
    const props = me.inputs[param][element];

    for (const name in props) {
      if (name === 'options' && element === 'select') {
        props[name].forEach(opt => {
          input.add(MagicCircle.createCtrlOpt(opt, opt === value));
        });
      }
      else input.setAttribute(name, props[name]);
    }

    input.setAttribute('id', param);
    input.setAttribute('name', param);
    input.setAttribute('value', value);

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
      const txt = this.inputs[param].label ?? param;
      div.appendChild(MagicCircle.createCtrlLabel(txt, param));
    }

    div.appendChild(input);

    const switchType = {range: 'number', number: 'range'};
    if (props.type in switchType) {
      input._valueAttr = 'valueAsNumber';
      const output = MagicCircle.createCtrlOutput(param, value, props.type);
      div.appendChild(output);

      // Allow user to switch between number|range types.
      div.addEventListener('dblclick', function (event) {
        if (event.target.nodeName === 'INPUT')
          return;
        const type = switchType[input.getAttribute('type')];
        input.setAttribute('type', type);
        output.style.display = type === 'range' ? 'inline-block' : 'none';
        // Switching steps param to 'range' type may block animation if the anim
        // scale is less than or equal to 0.5, need to trigger stepHandler.
        const stepParam = {multiplier: 'mulStep', modulus: 'modStep'}[param];
        if (stepParam) {
          me[stepParam] = me[stepParam]; // eslint-disable-line no-self-assign
        }
      });
    }

    if (me.inputs[param].toggle) {
      const toggle = me.createCtrlToggle(param);
      toInit.push(toggle);
      div.appendChild(toggle);
    }

    return div;
  }

  static createCtrlOpt(option, selected) {
    const opt = document.createElement('option');
    opt.text = option;
    opt.value = option;
    opt.selected = selected;
    return opt;
  }

  static createCtrlLabel(txt, param) {
    const label = document.createElement('label');
    label.appendChild(document.createTextNode(txt));
    label.setAttribute('for', param);
    return label;
  }

  static createCtrlOutput(param, value, type) {
    const output = document.createElement('output');
    output.setAttribute('name', param + '-output');
    output.setAttribute('for', param);
    output.value = value;
    output.style.display = type === 'range' ? 'inline-block' : 'none';
    return output;
  }

  createCtrlToggle(param) {
    const me = this;
    const tParam = param + 'Toggle';

    me.defineProxyField(tParam);
    me[tParam] = !(me.inputs[param].disabled ?? false);
    me.inputs[tParam] = {};

    const toggle = document.createElement('input');
    toggle.setAttribute('id', tParam);
    toggle.setAttribute('type', 'checkbox');
    toggle.setAttribute('name', tParam);
    toggle.setAttribute('value', me[tParam]);

    if (typeof me.inputs[param].toggle === 'string')
      toggle.setAttribute('title', me.inputs[param].toggle);

    if (me[tParam]) toggle.setAttribute('checked', true);
    else toggle.removeAttribute('checked');

    toggle._valueAttr = 'checked';

    toggle.addEventListener('input', function (event) {
      me.inputHandler.apply(me, [this, tParam, event]);
    });

    return toggle;
  }

  updateInput(param, value) {
    const element = document.getElementById(param);
    if (!element)
      return false;

    element.value = value;
    if (element._valueAttr)
      element[element._valueAttr] = value;

    element.dispatchEvent(new Event('input'));
    return true;
  }

  inputHandler(input, param, event) {
    const value = input._valueAttr ? input[input._valueAttr] : input.value;

    if (param in this.#p) {
      this.#p[param] = value;
    }

    if (input.type === 'range' || input.type === 'number')
      input.nextElementSibling.value = Math.round(value * 1000) / 1000;

    if (this.inputs[param].handler) {
      if (typeof this.inputs[param].handler === 'function')
        this.inputs[param].handler.call(this, input, param, value, event);
      else
        this[this.inputs[param].handler](input, param, value, event);
    }

    if (this.animation.paused && event.detail != 'init')
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

    // Show lpfFilter only for leastPrimeFactor pattern.
    const lpf = document.getElementsByClassName('lpfFilter')[0];
    if (lpf) {
      lpf.style.display = pattern === 'leastPrimeFactor' ? 'block' : 'none';
    }

    if (pattern === 'monoShifted')
      this.animation.hooks.colorShift = this.colorShift;
    else
      delete this.animation.hooks.colorShift;
  }

  stepHandler(input, param, value) {
    const id = {mulStep: 'multiplier', modStep: 'modulus'}[param];
    const target = document.getElementById(id);
    if (target.type === 'range' && this.animScale && this.animScale % 1 != 0) {
      // Range input type prevent values that don't fall on a step, which would
      // block animation for animScale <= 0.5, or make it shaky.
      const d = String(this.animScale % 1).split('.')[1];
      const m = Utils.gcd(+d, 10**d.length) / 10**d.length;
      value *= m;
    }
    target.setAttribute('step', value);
  }

  animScaleHandler(input, param, value, event) {
    input.nextElementSibling.value += 'x';
    if (event.detail != 'init') {
      // This is to trigger stepHandler
      this.modStep = this.modStep; // eslint-disable-line no-self-assign
      this.mulStep = this.mulStep; // eslint-disable-line no-self-assign
    }
  }

  static lpfGenPalette(len) {
    const colors = Utils.rotate([...COLOR_PALETTES.triadic], 4);
    const pal = Array(len);

    const fillpal = (n, color) => {
      const step = n;
      do if (!pal[n]) pal[n] = color;
      while ((n+=step) < len);
    };

    pal[1] = Utils.randomColor();
    fillpal(2, '#555555');

    let n = 3;
    for (n; colors.length; n+=2) {
      fillpal(n, Utils.rgb2hex(colors.shift()));
    }
    for (n; n<len; n+=2) {
      fillpal(n, Utils.randomColor());
    }

    return pal;
  }

  static colorPaletteVariants(palettes) {
    const variants = {};
    for (const pal in palettes) {
      for (let i=0; i<palettes[pal].length; i++) {
        variants[`${pal}_${i}`] = Utils.rotate([...palettes[pal]], i, true);
      }
    }
    return variants;
  }

  toggleAnimation() {
    this.animation.paused = !this.animation.paused;
    if (!this.animation.paused) {
      this.animate();
    }
  }

  animate() {
    for (const anim in this.animation.hooks) {
      this.animation.hooks[anim].call(this);
    }

    this.render();

    if (this.animation.paused)
      return;

    requestAnimationFrame(this.animate.bind(this));
  }
}

/**
 * Utils/helper singleton
 */
const Utils = {

  windowWidth() {
    return window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;
  },

  windowHeight() {
    return window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body && document.body.clientHeight;
  },

  randomColor() {
    return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  },

  rgb2hex(rgb) {
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
  },

  hex2rgb(hex) {
    return hex.slice(1).match(/.{2}/g).map(c => parseInt(c, 16));
  },

  rotate(array, r=1, rev=false) {
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
  },

  type(obj) {
    return Object.prototype.toString.call(obj).slice(8,-1);
  },

  isObject(obj) {
    return Utils.type(obj) === 'Object';
  },

  /**
   * Merge `source` into `target` recursively.
   * Nb. arrays, functions and scalar values override target values.
   */
  merge(target, source) {
    for (const key in source) {
      if (Utils.isObject(target[key]) && Utils.isObject(source[key]))
        Utils.merge(target[key], source[key]);
      else
        target[key] = source[key];
    }
    return target;
  },

  gcd(a, b) {
    const f = (x, y) => y === 0 ? x : f(y, x % y);
    return f(Math.abs(a), Math.abs(b));
  }
};


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

};
