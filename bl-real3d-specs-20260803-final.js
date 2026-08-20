(function(){
  function faceLabel(value){
    const s=String(value||'').trim();
    if(!s) return '';
    const map={'Notruf / Alarm':'ALARM','Not-Halt':'STOP','Tür auf':'◀  ▶','Tür zu':'▶  ◀','Laden':'L','Lüfter':'L'};
    return map[s]||s;
  }
  function base(sel, extra){
    return Object.assign({
      label: sel && sel.label || '',
      kind: sel && sel.kind || 'Bauteil',
      info: sel && sel.info || '',
      size: sel && sel.size || 42,
      color: sel && sel.color || '',
      kicker:'3D-Vorschau',
      description:'',
      sizeLabel:'Baugröße',
      colorLabel:'Ausführung',
      faceLabel: faceLabel(sel && sel.label)
    },extra||{});
  }
  function tableauButton(sel, config){
    const large=!!(config&&config.grossflaechenTaster), round=(config&&config.buttonShape)==='Rund';
    if(large&&round) return base(sel,{component:'b50r',modelPath:'/assets/models/b50_r_real_u3d.json',title:'B50 R Großflächentaster',sizeValue:'Ø 54 mm',colorLabel:'Quittierung',colorValue:sel.color||'—'});
    if(large&&!round) return base(sel,{component:'b50q',modelPath:'/assets/models/b50_q_real_u3d.json',title:'B50 Q Großflächentaster',sizeValue:'54 × 54 mm',colorLabel:'Quittierung',colorValue:sel.color||'—'});
    if(round) return base(sel,{component:'vb42',modelPath:'/assets/models/vb42_real_u3d.json',title:'VB42 Rundtaster',sizeValue:'Ø 42 mm',colorLabel:'Quittierung',colorValue:sel.color||'—'});
    return base(sel,{component:'mt42',modelPath:'/assets/models/mt42_real_u3d.json',title:'MT42 Taster',sizeValue:'42 × 42 mm',colorLabel:'Quittierung',colorValue:sel.color||'—'});
  }
  function keySwitch(sel){
    return base(sel||{label:'Schlüsselschalter',kind:'Schlüsselschalter'},{component:'ms42',modelPath:'/assets/models/ms42_real_u3d.json',title:'MS42 Schlüsselschalter',sizeValue:'42 × 42 mm',colorLabel:'Ausführung',colorValue:'Schlüsselschalter',faceLabel:''});
  }
  function hallArrow(sel){
    return base(sel||{label:'Weiterfahrtspfeile',kind:'Außenruf-Taster'},{component:'ra42',modelPath:'/assets/models/ra42_real_u3d.json',title:'RA42 Weiterfahrtspfeile',sizeValue:'Ø 42 mm',colorLabel:'Ausführung',colorValue:'Weiterfahrtspfeile',faceLabel:''});
  }
  function hallButton(sel){
    const info=String(sel&&sel.info||'');
    if(info.indexOf('Pfeil')>=0 || String(sel&&sel.label||'').indexOf('Pfeil')>=0) return hallArrow(sel);
    return base(sel||{label:'RUF',kind:'Außenruf-Taster'},{component:'vb42',modelPath:'/assets/models/vb42_real_u3d.json',title:'VB42 Rundtaster',sizeValue:'Ø 42 mm',colorLabel:'Ausführung',colorValue:'Außenruf-Taster'});
  }
  function screw(){
    return base({label:'M4 × 20 S-Torx',kind:'Befestigungsschraube',color:'S-Torx'},{component:'screw',modelPath:'/assets/models/m4_s_torx_20_model.json',title:'M4 × 20 S-Torx Schraube',kicker:'3D-Vorschau',description:'',sizeLabel:'Gewinde / Länge',sizeValue:'M4 × 20 mm',colorLabel:'Antrieb',colorValue:'S-Torx',faceLabel:''});
  }
  window.BLReal3D={tableauButton,keySwitch,hallArrow,hallButton,screw};
})();
