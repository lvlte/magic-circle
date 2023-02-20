
// Nb. Should use `window.addEventListener('load', handler)` to ensure `handler`
// executes once css has finished loading, but the event won't fire consistently
// on htmlpreview.github.io, so we are left with DOMContentLoaded.
// @see https://github.com/htmlpreview/htmlpreview.github.com/issues/126
document.addEventListener('DOMContentLoaded', function() {
  new MagicCircle('wrapper', {
    paletteVariants: true,
    colorPattern: 'segmentLength',
    colorPalette: 'dyadic_1',
    controls: true,
    axis: {label: {color: '#b8d0b2'}},
  });

  // Since 'DOMContentLoaded' fires before css styles are fully loaded/applied,
  // we trigger several 'resize' events to ensure the layout is built according
  // to those styles.
  const trigger = () => window.dispatchEvent(new Event('resize'));
  [1,2,3,4,5,6].forEach(n => setTimeout(trigger, n*50));
});
