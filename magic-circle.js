
class MagicCircle {

  constructor (id, settings) {

    // Default settings
    const defaults = {

      multiplier: 2,
      modulus: 10,

      modStep: 0.05,
      mulStep: 0.01,

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

  setAxis() {
    this.translateTo(this.centerX, this.centerY);
    this.drawCircle();
    this.setPoints();

    for (let i=0; i<this.modulus; i++) {
      const ptLabel = {
        x: this.points[i].x * 1.1,
        y: this.points[i].y * 1.1
      };

      this.setAxisLabel(ptLabel, i);
    }
  }

  setAxisLabel(point, label) {
    this.ctx.font = this.axis.fontSize + 'px Arial';
    this.ctx.fillStyle = this.axis.labelColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, point.x, point.y);
  }

  setPoints() {
    const modAng = 2*Math.PI/this.modulus;
    let angle = this.axis.offset;
    this.points = [];

    for (let i=0; i<this.modulus; i++) {
      this.points.push({
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      });

      angle += modAng;
    }
  }

  relyPoints() {
    const points = this.points,
        modAng = 2*Math.PI/this.modulus,
        multiplier = this.multiplier,
        len = points.length;

    this.translateTo(this.centerX, this.centerY);

    for (let i=1; i<len; i++) {
      const j = (i * multiplier) % this.modulus;

      const a = points[i];
      const b = Math.floor(j) === j ? points[j] : {
        x: Math.cos(j * modAng + this.axis.offset) * this.radius,
        y: Math.sin(j * modAng + this.axis.offset) * this.radius
      };

      this.drawLine(a.x, a.y, b.x, b.y);
    }
  }

  clean() {
    this.translateTo(0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  render() {
    this.clean();
    this.setAxis();
    this.relyPoints();
  }

  translateTo(x, y) {
    const dx = x - this.axis.origin.x;
    const dy = y - this.axis.origin.y;

    this.axis.origin.x = x;
    this.axis.origin.y = y;

    this.ctx.translate(dx, dy);
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


document.addEventListener('DOMContentLoaded', function(e) {
  const mc = new MagicCircle('f-canvas');
  console.log('MagicCircle', mc);

  mc.render();

  mc.ctx.canvas.addEventListener('click', function (e) {
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
