/* Table container/reset pattern adapted from Lee Munroe's MIT responsive HTML
 * email template. Full attribution in vendor/responsive-email-LICENSE.txt. */
var F09Export = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v, fallback = 0, max = 2000) => Number.isFinite(v) && v >= 0 && v <= max ? v : fallback;
  function url(v) {
    if (typeof v !== 'string' || !/^https:\/\/[^\s<>"']+$/i.test(v)) throw new Error('Use an absolute HTTPS URL for links and images.');
    return esc(v);
  }
  function color(fills) {
    if (!fills || fills.length === 0) return null;
    if (!Array.isArray(fills)) throw new Error('Mixed fills are not supported.');
    const visible = fills.filter(f => f.visible !== false);
    if (!visible.length) return null;
    if (visible.length !== 1 || visible[0].type !== 'SOLID' || (visible[0].opacity ?? 1) !== 1) throw new Error('Use one opaque solid fill; publish images as HTTPS assets.');
    const c = visible[0].color;
    if (!c || !['r','g','b'].every(k => Number.isFinite(c[k]) && c[k]>=0 && c[k]<=1)) throw new Error('Invalid solid color.');
    return '#' + ['r','g','b'].map(k => Math.round(c[k]*255).toString(16).padStart(2,'0')).join('');
  }
  function render(root, options = {}) {
    const maxNodes = options.maxNodes ?? 40;
    let count = 0;
    function node(n, depth = 0) {
      if (!n || depth > 12 || ++count > maxNodes) throw new Error('Export limit exceeded (' + maxNodes + ' nodes, 12 levels). Simplify the frame.');
      if (n.visible === false) return '';
      if ((n.rotation && Math.abs(n.rotation)>0.1) || (n.opacity != null && n.opacity !== 1) || n.isMask || n.layoutPositioning === 'ABSOLUTE' || (n.effects || []).some(e => e.visible !== false) || (n.strokes || []).some(s => s.visible !== false)) throw new Error('Remove rotation, opacity, masks, absolute positioning, effects and strokes: ' + n.name);
      let result;
      const bg = color(n.fills);
      if (n.type === 'TEXT') {
        if (typeof n.characters !== 'string' || n.characters.length > 50000) throw new Error('Invalid or oversized text.');
        const size = num(n.fontSize,16,100);
        const weight = num(n.fontWeight,400,900);
        const align = {LEFT:'left',CENTER:'center',RIGHT:'right'}[n.textAlignHorizontal] || 'left';
        result = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:'+size+'px;line-height:1.5;font-weight:'+weight+';color:'+(bg || '#17243b')+';text-align:'+align+';overflow-wrap:anywhere">'+esc(n.characters).replace(/\n/g,'<br>')+'</div>';
      } else if (n.type === 'RECTANGLE') {
        if (n.imageUrl) result = '<img src="'+url(n.imageUrl)+'" alt="'+esc(n.alt || n.name)+'" width="'+num(n.width,600)+'" style="display:block;border:0;width:100%;max-width:'+num(n.width,600)+'px;height:auto">';
        else result = '<div style="height:'+num(n.height,16)+'px;background:'+(bg || '#ffffff')+';font-size:1px;line-height:1px">&nbsp;</div>';
      } else if (['FRAME','COMPONENT','INSTANCE'].includes(n.type)) {
        if (!['VERTICAL','HORIZONTAL'].includes(n.layoutMode)) throw new Error('Use vertical or horizontal Auto Layout: ' + n.name);
        if (!Array.isArray(n.children) || n.children.length > 400) throw new Error('Invalid frame children.');
        if (n.layoutWrap && n.layoutWrap !== 'NO_WRAP') throw new Error('Auto Layout wrapping is not supported.');
        const children = n.children.filter(c => c.visible !== false);
        const gap = num(n.itemSpacing);
        const pad = ['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(k => num(n[k])+'px').join(' ');
        let rows;
        if (n.layoutMode === 'HORIZONTAL') {
          const total = children.reduce((s,c)=>s+num(c.width,1),0) || 1;
          rows = '<tr>'+children.map((c,i)=>'<td class="stack" width="'+Math.round(num(c.width,1)/total*100)+'%" style="vertical-align:top;padding-right:'+(i<children.length-1?gap:0)+'px">'+node(c,depth+1)+'</td>').join('')+'</tr>';
        } else rows = children.map((c,i)=>'<tr><td style="padding-bottom:'+(i<children.length-1?gap:0)+'px">'+node(c,depth+1)+'</td></tr>').join('');
        result = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:'+(bg || 'transparent')+'"><tr><td style="padding:'+pad+'"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'+rows+'</table></td></tr></table>';
      } else throw new Error('Unsupported node '+esc(n.type)+': '+n.name);
      if (n.href) result = '<a href="'+url(n.href)+'" style="color:inherit;text-decoration:none">'+result+'</a>';
      return result;
    }
    if (!root || !['FRAME','COMPONENT','INSTANCE'].includes(root.type)) throw new Error('Select exactly one email Auto Layout frame.');
    const width = Math.round(num(root.width,600,1000));
    if (width < 240) throw new Error('Email width must be 240–1000 px.');
    const content = node(root);
    const title = esc(options.title || root.name || 'Email');
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>'+title+'</title><style>body{margin:0;padding:0;background:#f4f5f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}td{vertical-align:top}img{border:0;max-width:100%}@media only screen and (max-width:620px){.container{width:100%!important}.stack{display:block!important;width:100%!important;box-sizing:border-box;padding-right:0!important;padding-bottom:16px!important}}</style></head><body><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><!--[if mso]><table role="presentation" width="'+width+'"><tr><td><![endif]--><table role="presentation" class="container" width="'+width+'" cellpadding="0" cellspacing="0" style="width:100%;max-width:'+width+'px"><tr><td>'+content+'</td></tr><tr><td style="padding:24px;text-align:center;font:12px Arial;color:#58657a">{% unsubscribe %}</td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
    return {html, count, width, warnings:['Custom HTML template; not editable as Klaviyo drag-and-drop blocks.','Check your legal sender address, unsubscribe link, content and email-client rendering before sending.']};
  }
  return {render, esc};
})();
if (typeof module !== 'undefined') module.exports = F09Export;
