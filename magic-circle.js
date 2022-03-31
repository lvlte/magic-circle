
class MagicCircle {

  constructor (id, settings) {

    // Default settings
    const defaults = {

      multiplier: 2,
      modulus: 10,

      mulStep: 0.005,
      modStep: 0.05,

      // segments color
      color: '#999',

      // Radial axis
      axis: {
        offset: -Math.PI/2,       // angular offset
        color: '#999',
        labelColor: '#b8d0b2',
        fontSize: '13',
        fontFamily: 'Arial',
        origin: {
          x: 0,                   // -x offset
          y: 0                    // -y offset
        }
      },

      controls: {
        multiplier: {
          input: {
            type: 'range',
            min: 0,
            max: 10000
          }
        },
        modulus: {
          input: {
            type: 'range',
            min: 2,
            max: 5000
          }
        }
      }
    }

    // Apply defaults settings.
    for (const prop in defaults) {
      this[prop] = defaults[prop];
    }

    // Override with passed-in settings if any.
    for (const prop in settings) {
      this[prop] = settings[prop];
    }

    const canvas = document.getElementById(id);
    canvas.width = Math.floor(screenWidth());
    canvas.height = Math.floor(screenHeight());

    this.radius = Math.floor(Math.min(canvas.width, canvas.height) / 2.5);

    this.centerX = Math.floor(canvas.width / 2);
    this.centerY = Math.floor(canvas.height / 2);

    this.ctx = canvas.getContext('2d');
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

  drawAxis() {
    this.translateTo(this.centerX, this.centerY);
    this.drawCircle();
    this.setPoints();

    for (let n=0; n<this.modulus; n++) {
      const ptLabel = {
        x: this.points[n].x * 1.1,
        y: this.points[n].y * 1.1
      };

      this.drawAxisLabel(ptLabel, n);
    }
  }

  drawAxisLabel(point, label) {
    const ctx = this.ctx;

    ctx.font = this.axis.fontSize + 'px Arial';
    ctx.fillStyle = this.axis.labelColor;
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

      this.drawLine(a.x, a.y, b.x, b.y);
    }
  }

  drawCircle() {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, 2*Math.PI);

    ctx.strokeStyle = this.axis.color;
    ctx.stroke();
  }

  drawLine(x1, y1, x2, y2) {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.strokeStyle = this.color;
    ctx.stroke();
  }

  addControls() {
    const ctrl = document.getElementById('controls');
    const form = document.createElement('form');

    for (const param in this.controls) {
      const input = document.createElement('input');
      input.setAttribute('id', param);
      input.setAttribute('value', this[param]);

      const attr = this.controls[param].input;
      for (const name in attr) {
        input.setAttribute(name, attr[name]);
      }

      const label = document.createElement('label');
      label.setAttribute('for', param);
      label.appendChild(document.createTextNode(param));

      const div = document.createElement('div');
      div.className = 'parameter';
      div.appendChild(label);
      div.appendChild(input);

      form.appendChild(div);
    }

    ctrl.appendChild(form);
  }

}


function screenWidth () {
  return window && window.innerWidth ||
          document.documentElement && document.documentElement.clientWidth ||
          document.body && document.body.clientWidth;
}

function screenHeight () {
  return window && window.innerHeight ||
          document.documentElement && document.documentElement.clientHeight ||
          document.body && document.body.clientHeight;
}


document.addEventListener('DOMContentLoaded', function() {
  const mc = new MagicCircle('f-canvas');
  console.log('MagicCircle', mc);

  mc.render();
  mc.addControls();

  mc.ctx.canvas.addEventListener('click', function () {
    mc.multiplier += mc.mulStep;
    mc.render();
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.shiftKey || e.altKey)
      return;

    if (e.target.tagName === 'INPUT')
      return;

    mc.multiplier += mc.mulStep;
    mc.render();
  });

});
