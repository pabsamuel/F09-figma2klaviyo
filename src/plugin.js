figma.showUI(__html__, {width: 480, height: 720, themeColors: true});
function snapshot(n, depth = 0) {
  if (depth > 12) throw new Error('Selection is too deeply nested.');
  const out = {};
  for (const k of ['type','name','visible','width','height','rotation','opacity','isMask','layoutMode','layoutWrap','layoutPositioning','itemSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','textAlignHorizontal']) {
    if (n[k] !== undefined) out[k] = n[k];
  }
  for (const k of ['fills','strokes','effects','fontSize']) {
    if (n[k] === figma.mixed) throw new Error('Mixed text styles or fills are not supported: ' + n.name);
    if (n[k] !== undefined) out[k] = JSON.parse(JSON.stringify(n[k]));
  }
  if (n.type === 'TEXT') {
    if (n.fontName === figma.mixed || n.fontWeight === figma.mixed) throw new Error('Use one text style per text node.');
    out.characters = n.characters;
    out.fontWeight = n.fontWeight;
    if (n.hyperlink === figma.mixed) throw new Error('Use one link per text node.');
    if (n.hyperlink?.type === 'URL') out.href = n.hyperlink.value;
  }
  const href = n.getPluginData('emailHref');
  if (href) out.href = href;
  const image = n.getPluginData('emailImageUrl');
  if (image) {out.imageUrl = image; out.fills = [];}
  out.alt = n.getPluginData('emailAlt') || n.name;
  if ('children' in n) {
    if (n.children.length > 400) throw new Error('Too many nodes.');
    out.children = n.children.filter(c => c.visible !== false).map(c => snapshot(c,depth+1));
  }
  return out;
}
figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'set-image') {
      const n = figma.currentPage.selection[0];
      if (figma.currentPage.selection.length !== 1 || n.type !== 'RECTANGLE') throw new Error('Select one rectangle for a hosted image.');
      if (!/^https:\/\/[^\s<>"']+$/i.test(msg.url)) throw new Error('Enter a public HTTPS image URL.');
      n.setPluginData('emailImageUrl',msg.url); n.setPluginData('emailAlt',String(msg.alt || n.name));
      figma.ui.postMessage({type:'notice',message:'Image URL saved. Select the email frame to export.'});
    }
    if (msg.type === 'export') {
      if (figma.currentPage.selection.length !== 1) throw new Error('Select exactly one email Auto Layout frame.');
      const tree = snapshot(figma.currentPage.selection[0]);
      const output = F09Export.render(tree,{title:msg.title,maxNodes:40});
      figma.ui.postMessage({type:'exported',tree, ...output});
    }
  } catch (e) {figma.ui.postMessage({type:'error',message:e.message});}
};
