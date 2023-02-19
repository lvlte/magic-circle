
document.addEventListener('DOMContentLoaded', function() {

  const mc = new MagicCircle('wrapper', {
    paletteVariants: true,
    colorPattern: 'segmentLength',
    colorPalette: 'dyadic_1',
    controls: true,
    axis: {label: {color: '#b8d0b2'}},
  });

  window.mc = mc;
  console.log('MagicCircle', mc);
});
