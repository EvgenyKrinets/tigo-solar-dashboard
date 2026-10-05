const TIGO_FRONTEND_VERSION='2.23.12';
const TIGO_PANEL_TAG='tigo-solar-panel-v2-23-12';
class TigoSolarPanel extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'});
    this.data={panels:[],roof:'',settings:{}}; this.selected=null; this.edit=false; this.loading=true;
    this.history=[]; this.panelTrendSelection=['power']; this.panelTrendCache={}; this.panelTrendLoading=false; this.panelTrendError=''; this.panelTrendHover=null; this.busy=false; this.language='ru'; this.filter='ALL'; this.summarySelection={strings:[],panels:[]}; this.drag=null; this.settingsOpen=false; this.roofZoom=100; this.pinch=null; this.pan=null; this.displayScope='ALL'; this.displayTarget=''; this.editorOpen=false; this.carouselIndex=0; this.chartIndex=0; this.viewMode='all';this._onResize=()=>{this.fitRoofGeometry();requestAnimationFrame(()=>{this.fitRoofGeometry();this.fitMarkerText();});};window.addEventListener('resize',this._onResize);window.addEventListener('orientationchange',this._onResize);window.visualViewport?.addEventListener('resize',this._onResize);
  }
  disconnectedCallback(){window.removeEventListener('resize',this._onResize);window.removeEventListener('orientationchange',this._onResize);window.visualViewport?.removeEventListener('resize',this._onResize);clearInterval(this._rotationTimer);}
  set hass(value) { this._hass=value; if (!this.loaded) {this.loaded=true; this.init();} else this.updateLive(); }
  get hass(){return this._hass;}
  async call(type,extra={}){return this.hass.connection.sendMessagePromise({type:'tigo_dashboard/'+type,...extra});}
  async init(){try {this.data=await this.call('get');if(this.data&&'_version' in this.data)delete this.data._version; this.language=this.data.settings?.language||'ru'; this.ensureSettings(); this.loading=false; const first=this.data.panels?.[0];if(first){const metric=this.panelTrendMetrics(first)[0]?.[0];this.panelTrendSelection=metric?[metric]:[];} this.render(); if(first)this.loadPanelTrend().catch(()=>{}); if(!this.data.panels.length) await this.discover(false);}catch(e){this.loading=false;this.error(e);}}
  ensureSettings(){this.data.settings={markerSize:64,markerWidth:64,markerHeight:64,markerFields:['power'],gradient:true,gradientField:'power',gradientColor:'#10b981',gradientColorLow:'#1e3a8a',markerLayout:'vertical',mobileCompact:true,showPanelNames:true,stringStyles:{},panelStyles:{},barField:'none',barMin:0,barMax:500,rotateFields:false,rotateThreshold:3,rotateSeconds:4,summaryStrings:[],summaryMetrics:["power","temperature"],...(this.data.settings||{})};if(!Array.isArray(this.data.settings.summaryStrings))this.data.settings.summaryStrings=[];if(!Array.isArray(this.data.settings.summaryMetrics))this.data.settings.summaryMetrics=['power','temperature'];if(!Array.isArray(this.data.settings.markerFields))this.data.settings.markerFields=['power'];if(!this.data.settings.stringStyles||typeof this.data.settings.stringStyles!=='object')this.data.settings.stringStyles={};if(!this.data.settings.panelStyles||typeof this.data.settings.panelStyles!=='object')this.data.settings.panelStyles={};}
  t(ru,en,he){if(this.language==='ru')return ru;if(this.language==='he')return he||({'Карта крыши':'מפת הגג','Мощность':'הספק','Панели':'פאנלים','На связи':'מחובר','Строки':'מחרוזות','Все строки':'כל המחרוזות','Строка':'מחרוזת','панелей':'פאנלים','Мощность за 24 часа':'הספק ב־24 השעות האחרונות','Масштаб':'זום','Вся крыша':'כל הגג','Загрузить фото':'העלה תמונה','Редактировать расположение':'ערוך מיקום','Сохранить расположение':'שמור מיקום','Найти панели':'חפש פאנלים','Сохранено':'נשמר','Температура':'טמפרטורה','Энергия':'אנרגיה','Средняя температура':'טמפרטורה ממוצעת','Сейчас':'עכשיו','Ширина':'רוחב','Высота':'גובה','Все панели':'כל הפאנלים','Датчик':'חיישן','Минимум':'מינימום','Максимум':'מקסימום','Сохранить':'שמור','Редактирование':'עריכה'})[ru]||en;return en;}
  error(e){this.message=String(e?.message||e);this.render();}
  state(id){return id&&this.hass.states[id]||null;}
  val(p,k){const s=this.state(p?.entities?.[k]);return s&&s.state!=='unavailable'&&s.state!=='unknown'?s.state:null;}
  num(p,k){const n=Number(this.val(p,k));return this.val(p,k)===null||!Number.isFinite(n)?null:n;}
  fmt(v,d=1){return v===null||v===undefined?'—':Number(v).toLocaleString(this.language==='ru'?'ru-RU':this.language==='he'?'he-IL':'en-US',{maximumFractionDigits:d});}
  esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async discover(auto=true){try {const result=await this.call('discover');this.found=result.panels; if(auto) this.render();else if(this.found.length){this.data.panels=this.found;this.selected=this.found[0].id;this.render();this.message=this.t('Панели обнаружены. Нажмите «Сохранить».','Panels detected. Click Save.','הפאנלים זוהו. יש לשמור את השינויים.');this.render();}else this.render();}catch(e){this.error(e);}}
  async addFound(){if(!this.found)await this.discover();const existing=new Set(this.data.panels.map(p=>p.id));for(const p of this.found||[])if(!existing.has(p.id))this.data.panels.push(p);this.selected??=this.data.panels[0]?.id;this.render();await this.save();}
  async save(){if(this.busy)return;this.busy=true;try {this.data=await this.call('save',{panels:this.data.panels,settings:{...this.data.settings,language:this.language}});this.ensureSettings();this.message=this.t('Сохранено','Saved','השינויים נשמרו');this.edit=false;this.editorOpen=false;this.settingsOpen=false;this.closeWidgetPicker();}catch(e){this.message=String(e.message||e);}finally{this.busy=false;this.render();}}
  // Add an existing Tigo widget to a chosen storage-mode Lovelace dashboard.
  async openWidgetPicker(view){
    if(!this.hass.user?.is_admin){this.message=this.t('Для изменения Dashboard нужны права администратора','Administrator access is required','נדרשות הרשאות מנהל לעריכת לוח הבקרה');this.render();return;}
    this.widgetView=view||'roof';
    this.widgetDashboards=[];
    this.widgetError='';
    this.widgetBusy=true;
    this.renderWidgetPicker();
    try{
      const raw=await this.hass.connection.sendMessagePromise({type:'lovelace/dashboards/list'});
      const list=Array.isArray(raw)?raw:(raw?.dashboards||[]);
      // The built-in dashboard may not appear in the dashboard registry.
      const all=[{url_path:null,title:this.t('Обзор (основной)','Overview (default)','סקירה כללית (ברירת מחדל)'),mode:'storage'},...list];
      this.widgetDashboards=all.filter((d,i)=>all.findIndex(x=>(x.url_path||null)===(d.url_path||null))===i && d.mode!=='yaml');
      if(!this.widgetDashboards.length)throw new Error('No editable storage dashboards');
    }catch(e){this.widgetError=String(e.message||e);}
    this.widgetBusy=false;this.renderWidgetPicker();
  }
  closeWidgetPicker(){this.shadowRoot.querySelector('#widgetPicker')?.remove();}
  renderWidgetPicker(){
    let modal=this.shadowRoot.querySelector('#widgetPicker');
    if(!modal){modal=document.createElement('div');modal.id='widgetPicker';this.shadowRoot.appendChild(modal);}
    const options=this.widgetDashboards.map((d,i)=>`<option value="${i}">${this.esc(d.title||d.url_path||'Overview')}</option>`).join('');
    modal.innerHTML=`<div class="widgetShade"><div class="widgetDialog" role="dialog" aria-modal="true" aria-label="${this.t('Добавить виджет Tigo','Add Tigo widget','הוספת כרטיס Tigo')}">
      <h2>${this.t('Добавить виджет','Add widget','הוספת כרטיס')}</h2>
      <p>${this.t('Выбери Dashboard и страницу. Карточка добавится автоматически.','Choose a dashboard and a view. The card will be added automatically.','בחרו לוח בקרה ותצוגה. הכרטיס יתווסף אוטומטית.')}</p>
      <label>${this.t('Раздел виджета','Widget section','סוג הכרטיס')} <select id="widgetType"><option value="roof" ${this.widgetView==='roof'?'selected':''}>${this.t('Карта крыши','Roof layout','מפת הגג')}</option><option value="roof-wide">${this.t('Карта крыши на всю ширину','Full-width roof','מפת הגג ברוחב מלא')}</option><option value="stats">${this.t('Общая статистика','Overall statistics','נתוני המערכת')}</option><option value="strings">${this.t('Строки','Strings','סטרינגים')}</option><option value="detail">${this.t('Параметры панели','Panel details','נתוני הפאנל')}</option></select></label>
      <label>${this.t('Dashboard','Dashboard','לוח בקרה')} <select id="widgetDashboard" ${this.widgetBusy?'disabled':''}>${options}</select></label>
      <label>${this.t('Страница','View','תצוגה')} <select id="widgetTargetView" ${this.widgetBusy?'disabled':''}></select></label>
      ${this.widgetError?`<p class="widgetError">${this.esc(this.widgetError)}</p>`:''}
      <div class="widgetActions"><button class="btn" id="widgetCancel">${this.t('Отмена','Cancel','ביטול')}</button><button class="btn primary" id="widgetConfirm" ${this.widgetBusy||this.widgetError?'disabled':''}>${this.widgetBusy?'…':this.t('Добавить','Add','הוספה')}</button></div>
    </div></div>`;
    modal.querySelector('#widgetCancel').onclick=()=>this.closeWidgetPicker();
    modal.querySelector('.widgetShade').onclick=e=>{if(e.target===e.currentTarget)this.closeWidgetPicker();};
    modal.querySelector('#widgetType').onchange=e=>{this.widgetView=e.target.value;};modal.querySelector('#widgetDashboard').onchange=()=>this.loadWidgetViews();
    modal.querySelector('#widgetConfirm').onclick=()=>this.addWidgetToDashboard();
    if(!this.widgetBusy&&!this.widgetError)this.loadWidgetViews();
  }
  async loadWidgetViews(){
    const modal=this.shadowRoot.querySelector('#widgetPicker');if(!modal)return;
    const select=modal.querySelector('#widgetDashboard');const target=modal.querySelector('#widgetTargetView');
    const index=Number(select.value)||0;const dashboard=this.widgetDashboards[index];if(!dashboard)return;
    const request=this._widgetRequest=(this._widgetRequest||0)+1;
    target.disabled=true;target.innerHTML='<option>…</option>';
    modal.querySelector('#widgetConfirm').disabled=true;
    try{
      const args={type:'lovelace/config'};if(dashboard.url_path)args.url_path=dashboard.url_path;
      const config=await this.hass.connection.sendMessagePromise(args);
      if(request!==this._widgetRequest||!modal.isConnected)return;
      if(!Array.isArray(config.views)||!config.views.length)throw new Error('No views in this dashboard');
      this.widgetConfig=config;this.widgetDashboard=dashboard;
      target.innerHTML=config.views.map((v,i)=>`<option value="${i}">${this.esc(v.title||v.path||'View '+(i+1))}</option>`).join('');
      target.disabled=false;modal.querySelector('#widgetConfirm').disabled=false;
      modal.querySelector('.widgetError')?.remove();
    }catch(e){if(request!==this._widgetRequest||!modal.isConnected)return;this.widgetConfig=null;
      const error=modal.querySelector('.widgetError')||document.createElement('p');error.className='widgetError';error.textContent=this.t('Не удалось открыть Dashboard: ','Cannot open dashboard: ','לא ניתן לפתוח את לוח הבקרה: ')+String(e.message||e);modal.querySelector('.widgetActions').before(error);}
  }
  async ensureWidgetResource(){
    const url='/tigo_solar_dashboard/tigo-dashboard.js?v='+TIGO_FRONTEND_VERSION;
    const result=await this.hass.connection.sendMessagePromise({type:'lovelace/resources'});
    const resources=Array.isArray(result)?result:(result?.resources||[]);
    const existing=resources.find(r=>String(r.url||'').startsWith('/tigo_solar_dashboard/tigo-dashboard.js'));
    if(existing){
      if(existing.url!==url&&existing.id)await this.hass.connection.sendMessagePromise({type:'lovelace/resources/update',resource_id:existing.id,url,res_type:'module'});
      return;
    }
    await this.hass.connection.sendMessagePromise({type:'lovelace/resources/create',url,res_type:'module'});
  }
  async addWidgetToDashboard(){
    const modal=this.shadowRoot.querySelector('#widgetPicker');if(!modal||!this.widgetConfig||!this.widgetDashboard)return;
    const btn=modal.querySelector('#widgetConfirm');btn.disabled=true;
    const index=Number(modal.querySelector('#widgetTargetView').value);
    try{
      if(!Number.isInteger(index)||!this.widgetConfig.views[index])throw new Error('Invalid view');
      const config=JSON.parse(JSON.stringify(this.widgetConfig));
      const view=config.views[index];
      const card={type:'custom:tigo-solar-card',view:this.widgetView,height:320,columns:12,rows:5,zoom:100};
      if(this.widgetView==='detail'&&this.selected)card.panel=this.selected;
      if(this.widgetView==='strings'&&this.filter!=='ALL')card.string=this.filter;
      // Lovelace Sections use sections[].cards; masonry/panel views use views[].cards.
      if(view.type==='sections'){
        if(!Array.isArray(view.sections))view.sections=[];
        if(!view.sections.length)view.sections.push({type:'grid',cards:[]});
        if(!Array.isArray(view.sections[0].cards))view.sections[0].cards=[];
        card.grid_options={columns:6,rows:5};view.sections[0].cards.push(card);
      }else if(view.type==='panel'){
        // A panel view only supports one card. Never replace an existing one.
        if(Array.isArray(view.cards)&&view.cards.length)throw new Error(this.t('Эта страница допускает только одну карточку. Выбери другую страницу.','This panel view supports only one card. Choose another view.','בתצוגה זו אפשר להציג כרטיס אחד בלבד. יש לבחור תצוגה אחרת.'));
        view.cards=[card];
      }else{if(!Array.isArray(view.cards))view.cards=[];view.cards.push(card);}
      await this.ensureWidgetResource();
      const save={type:'lovelace/config/save',config};if(this.widgetDashboard.url_path)save.url_path=this.widgetDashboard.url_path;
      await this.hass.connection.sendMessagePromise(save);
      this.closeWidgetPicker();this.message=this.t('Виджет добавлен на выбранный Dashboard','Widget added to selected dashboard','הכרטיס נוסף ללוח הבקרה שנבחר');this.render();
    }catch(e){const error=modal.querySelector('.widgetError')||document.createElement('p');error.className='widgetError';error.textContent=this.t('Не удалось добавить: ','Could not add: ','ההוספה נכשלה: ')+String(e.message||e);modal.querySelector('.widgetActions').before(error);btn.disabled=false;}
  }
  async upload(file){if(!file)return;if(file.size>8000000){this.message=this.t('Максимум 8 МБ','Maximum 8 MB','גודל הקובץ המרבי הוא 8 MB');this.render();return;}try{const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});const v=await this.call('upload_roof',{image:b64});this.data.roof=v.roof;this.message=this.t('Фото сохранено','Photo saved','תמונת הגג נשמרה');this.render();}catch(e){this.error(e);}}
  async select(id){this.selected=id;this.history=[];const panel=this.data.panels.find(p=>p.id===id);const metric=this.panelTrendMetrics(panel)[0]?.[0];this.panelTrendSelection=metric?[metric]:[];this.panelTrendError='';this.render();this.loadPanelTrend().catch(()=>{});if(window.matchMedia('(max-width: 700px)').matches){this.shadowRoot.querySelector('.detail')?.scrollIntoView({behavior:'smooth',block:'start'});}}
  async loadHistory(id){const p=this.data.panels.find(p=>p.id===id);const entity=p?.entities?.power;this.history=[];if(!entity){this.renderHistory();return;}try{const end=new Date(),start=new Date(end.getTime()-86400000);const url=`history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(entity)}&end_time=${encodeURIComponent(end.toISOString())}&minimal_response&no_attributes`;const raw=await this.hass.callApi('GET',url);if(this.selected!==id)return;this.history=(raw?.[0]||[]).map(x=>({t:new Date(x.last_changed||x.last_updated).getTime(),v:Number(x.state)})).filter(x=>Number.isFinite(x.v)&&Number.isFinite(x.t));}catch(e){this.historyError=String(e.message||e);}this.renderHistory();}
  showPowerHistory(){
    const panel=this.data.panels.find(p=>p.id===this.selected);
    const entity=panel?.entities?.power;
    if(entity)this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity},bubbles:true,composed:true}));
  }
  renderHistory(){
    const host=this.shadowRoot.querySelector('#history');if(!host)return;
    const h=this.history;
    if(h.length<2){host.innerHTML=`<div class="muted">${this.esc(this.historyError||this.t('История пока недоступна','History not available','נתוני ההיסטוריה אינם זמינים כרגע'))}</div>`;return;}
    const min=h[0].t,max=h[h.length-1].t||min+1,top=Math.max(1,...h.map(x=>x.v));
    const points=h.map(x=>`${((x.t-min)/(max-min||1)*1000).toFixed(2)},${(180-x.v/top*165).toFixed(2)}`).join(' ');
    const peak=h.reduce((a,b)=>b.v>a.v?b:a,h[0]);
    this.chartIndex=Math.max(0,Math.min(h.length-1,this.chartIndex));
    host.innerHTML=`<svg id="openHaHistory" style="cursor:pointer" title="${this.t('Открыть историю Home Assistant','Open Home Assistant history','פתיחת היסטוריה ב־Home Assistant')}" viewBox="0 0 1000 190" preserveAspectRatio="none" aria-label="${this.t('История мощности за 24 часа','24-hour power history','היסטוריית הספק ב־24 השעות האחרונות')}"><line x1="0" y1="180" x2="1000" y2="180" stroke="var(--divider-color,#516478)"/><polyline fill="none" stroke="var(--primary-color,#34d399)" stroke-width="3" vector-effect="non-scaling-stroke" points="${points}"/></svg><div class="chartlabels"><span>−24 h</span><span>${this.fmt(top,0)} W</span><span>${this.t('Сейчас','Now','עכשיו')}</span></div><input id="chartSlider" aria-label="${this.t('Время на графике','History time','בחירת זמן בגרף')}" type="range" min="0" max="${h.length-1}" value="${this.chartIndex}" style="width:100%"><div id="chartReadout" class="chartReadout"></div><div class="help">${this.t('Пик','Peak','הספק שיא')}: ${this.fmt(peak.v,1)} W · ${new Date(peak.t).toLocaleString(this.language==='he'?'he-IL':this.language==='ru'?'ru-RU':'en-US')}</div>`;
    const update=()=>{const x=h[Number(host.querySelector('#chartSlider').value)];host.querySelector('#chartReadout').textContent=new Date(x.t).toLocaleString(this.language==='he'?'he-IL':this.language==='ru'?'ru-RU':'en-US')+' · '+this.fmt(x.v,1)+' W';this.chartIndex=Number(host.querySelector('#chartSlider').value);};host.querySelector('#chartSlider').oninput=update;host.querySelector('#openHaHistory').onclick=()=>this.showPowerHistory();update();
  }
  addPanel(){const id=prompt(this.t('ID панели (например D01)','Panel ID (e.g. D01)','מזהה הפאנל (לדוגמה D01)'));if(!id||!/^[a-z0-9_-]+$/i.test(id)||this.data.panels.some(p=>p.id===id.toUpperCase()))return;const string=prompt(this.t('Имя строки','String name','שם הסטרינג'),id.replace(/[0-9]+$/,'')||'Other');if(string===null)return;this.data.panels.push({id:id.toUpperCase(),string:string||'Other',entities:{},x:null,y:null});this.selected=id.toUpperCase();this.render();this.save();}
  editMapping(){const p=this.data.panels.find(p=>p.id===this.selected);if(!p)return;const fields=['power','voltage_in','voltage_out','current_in','current_out','temperature','energy','rssi','duty_cycle','timestamp','node_serial','gateway_address'];const field=prompt(this.t('Поле:\n','Field:\n','שדה:\\n')+fields.join(', '),'power');if(!field||!fields.includes(field))return;const entity=prompt(this.t('Entity ID (пусто — удалить привязку)','Entity ID (blank removes mapping)','מזהה ישות ב־Home Assistant (להסרת השיוך יש להשאיר ריק)'),p.entities[field]||'');if(entity===null)return;if(entity&&!/^sensor\.[a-z0-9_]+$/.test(entity)){alert(this.t('Неверный sensor entity ID','Invalid sensor entity ID','מזהה החיישן אינו תקין'));return;}if(entity)p.entities[field]=entity;else delete p.entities[field];this.render();this.save();}
  updateLive(){if(this.loading||!this.shadowRoot.querySelector('.app'))return;for(const el of this.shadowRoot.querySelectorAll('[data-live]')){const p=this.data.panels.find(p=>p.id===el.dataset.panel);if(!p)continue;const v=this.num(p,el.dataset.live);el.textContent=this.fmt(v,1)+(v===null?'':el.dataset.unit||'');}this.updateTotals();this.updateMarkers();this.updateBars();this.updateStringDetail();const summary=this.shadowRoot.querySelector('.summaryDetail');if(summary){summary.outerHTML=this.summaryDetail();this.bindSummaryHistory();}this.fitMarkerText();}
  updateTotals(){const panels=this.data.panels;const powers=panels.map(p=>this.num(p,'power')).filter(x=>x!==null);const total=powers.reduce((a,b)=>a+b,0);const online=panels.filter(p=>this.val(p,'power')!==null).length;const el=this.shadowRoot.querySelector('#total');if(el)el.textContent=powers.length?this.fmt(total/1000,2)+' kW':'—';const on=this.shadowRoot.querySelector('#online');if(on)on.textContent=online+' / '+panels.length;for(const s of new Set(panels.map(p=>p.string))){const e=[...this.shadowRoot.querySelectorAll('[data-string-total]')].find(x=>x.dataset.stringTotal===s);if(e){const vals=panels.filter(p=>p.string===s).map(p=>this.num(p,'power')).filter(x=>x!==null);e.textContent=vals.length?this.fmt(vals.reduce((a,b)=>a+b,0)/1000,2)+' kW':'—';}}}
  fieldLabel(key){return ({power:this.t('Мощность','Power','הספק'),voltage_in:this.t('Напряжение вход','Voltage in','מתח כניסה'),voltage_out:this.t('Напряжение выход','Voltage out','מתח יציאה'),current_in:this.t('Ток вход','Current in','זרם כניסה'),current_out:this.t('Ток выход','Current out','זרם יציאה'),temperature:this.t('Температура','Temperature','טמפרטורה'),energy:this.t('Энергия','Energy','אנרגיה מצטברת'),rssi:'RSSI',duty_cycle:this.t('Коэффициент заполнения','Duty cycle','מחזור עבודה')})[key]||key;}
  fieldUnit(key){return ({power:'W',voltage_in:'V',voltage_out:'V',current_in:'A',current_out:'A',temperature:'°C',energy:'kWh',rssi:'dBm',duty_cycle:'%'})[key]||'';}
  markerColor(p){
    // Power is the connectivity reference, regardless of the gradient metric.
    if(this.num(p,'power')===null)return {background:'#653c40',border:'#e38b91'};
    const cfg=this.data.settings;
    if(!cfg.gradient)return {background:'#115a4d',border:'#34d399'};
    const field=cfg.gradientField||'power';
    const value=this.num(p,field);
    if(value===null)return {background:'#52606b',border:'#9ca3af'};
    const values=this.data.panels.filter(x=>this.num(x,'power')!==null).map(x=>this.num(x,field)).filter(Number.isFinite);
    if(!values.length)return {background:'#52606b',border:'#9ca3af'};
    const min=Math.min(...values),max=Math.max(...values);
    const ratio=max===min?1:Math.max(0,Math.min(1,(value-min)/(max-min)));
    const low=/^#[0-9a-f]{6}$/i.test(cfg.gradientColorLow||'')?cfg.gradientColorLow:'#1e3a8a';
    const high=/^#[0-9a-f]{6}$/i.test(cfg.gradientColor||'')?cfg.gradientColor:'#10b981';
    const from=[1,3,5].map(i=>parseInt(low.slice(i,i+2),16));
    const to=[1,3,5].map(i=>parseInt(high.slice(i,i+2),16));
    const rgb=from.map((v,i)=>Math.round(v+(to[i]-v)*ratio));
    const edge=rgb.map(c=>Math.round(c+(255-c)*.28));
    return {background:`rgb(${rgb.join(',')})`,border:`rgb(${edge.join(',')})`};
  }
  styleFor(p){const g=this.data.settings;return {width:g.markerWidth??g.markerSize??64,height:g.markerHeight??g.markerSize??64,layout:g.markerLayout||'vertical',...g.stringStyles?.[p.string],...g.panelStyles?.[p.id]};}
  editStyle(){const g=this.data.settings;if(this.displayScope==='STRING')return g.stringStyles[this.displayTarget]||{};if(this.displayScope==='PANEL')return g.panelStyles[this.displayTarget]||{};return g;}
  applyStyle(key,value){const g=this.data.settings;if(this.displayScope==='STRING'){g.stringStyles[this.displayTarget]??={};g.stringStyles[this.displayTarget][key]=value;}else if(this.displayScope==='PANEL'){g.panelStyles[this.displayTarget]??={};g.panelStyles[this.displayTarget][key]=value;}else g[({width:'markerWidth',height:'markerHeight',layout:'markerLayout'})[key]||key]=value;}
  marker(p,i){const x=p.x==null?8+(i%8)*11:p.x,y=p.y==null?12+Math.floor(i/8)*13:p.y;const power=this.num(p,'power');const online=power!==null;const color=this.markerColor(p);const title=`${p.id} · ${power===null?'—':this.fmt(power,0)+' W'}`;const fields=this.data.settings.markerFields||['power'];const rotating=this.data.settings.rotateFields&&fields.length>Number(this.data.settings.rotateThreshold||3);const cfg=this.styleFor(p);const w=Math.max(32,Math.min(220,Number(cfg.width)||64)),h=Math.max(28,Math.min(180,Number(cfg.height)||64));const font=Math.max(7,Math.min(15,Math.floor(Math.min(w/6,h/(fields.length+1))*.78)));return `<button class="marker ${cfg.layout==='horizontal'?'horizontal':'vertical'} ${online?'online':'offline'} ${p.id===this.selected?'selected':''} ${this.edit?'movable':''}" data-id="${this.esc(p.id)}" style="left:${x}%;top:${y}%;--marker-width:${w}px;--marker-height:${h}px;--field-font:${font}px;background:${color.background};border-color:${color.border}" title="${this.esc(title)}"><span class="markerName" ${this.data.settings.showPanelNames===false?'hidden':''}>${this.esc(p.id)}</span><span class="markerReadings ${rotating?'rotating':''}">${fields.map((k,idx)=>`<small data-rotation-index="${idx}" data-live="${this.esc(k)}" data-panel="${this.esc(p.id)}" data-unit=" ${this.esc(this.fieldUnit(k))}">${this.num(p,k)===null?'—':this.fmt(this.num(p,k),k==='power'?0:1)+' '+this.fieldUnit(k)}</small>`).join('')}</span>${this.data.settings.barField!=='none'?`<span class="markerBar"><span class="markerBarFill" style="width:${this.barValue(p)===null?0:Math.max(0,Math.min(100,(this.barValue(p)-Number(this.data.settings.barMin??0))/(Number(this.data.settings.barMax??500)-Number(this.data.settings.barMin??0))*100))}%"></span></span>`:''}${this.edit?`<span class="resizeHandle" title="Resize ${this.esc(p.id)}">↘</span>`:''}</button>`;}
  barValue(p){const field=this.data.settings.barField;if(!field||field==='none')return null;return this.num(p,field);}
  updateBars(){for(const el of this.shadowRoot.querySelectorAll('.marker')){const p=this.data.panels.find(p=>p.id===el.dataset.id);const bar=el.querySelector('.markerBarFill');if(!p||!bar)continue;const v=this.barValue(p),lo=Number(this.data.settings.barMin??0),hi=Number(this.data.settings.barMax??500);bar.style.width=(v===null?0:Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)))+'%';bar.parentElement.title=v===null?'Unavailable':`${this.fmt(v,1)} / ${this.fmt(hi,1)}`;}}
  editPanelControls(){const p=this.data.panels.find(x=>x.id===this.selected);if(!p||!this.edit)return '';const cfg=this.styleFor(p);return `<div class="quickEdit"><div class="sectionTitle">${this.t('Размер панели','Panel size','גודל הפאנל')} ${this.esc(p.id)}</div><div class="quickGrid"><label>${this.t('Ширина','Width','רוחב')} <output id="editWidthValue">${cfg.width} px</output><input id="editWidth" type="range" min="32" max="220" value="${cfg.width}"></label><label>${this.t('Высота','Height','גובה')} <output id="editHeightValue">${cfg.height} px</output><input id="editHeight" type="range" min="28" max="180" value="${cfg.height}"></label></div><div class="help">${this.t('Bar graph настраивается для всех панелей в меню «Вид панелей».','Configure the bar graph for all panels in Panel display settings.','מחוון העמודה מוגדר לכל הפאנלים בהגדרות תצוגת הפאנלים.')}</div></div>`;}
  bindPanelControls(){const q=s=>this.shadowRoot.querySelector(s),p=this.data.panels.find(x=>x.id===this.selected);if(!p||!this.edit)return;for(const [key,id,out] of [['width','editWidth','editWidthValue'],['height','editHeight','editHeightValue']]){const input=q('#'+id);if(input)input.oninput=e=>{this.data.settings.panelStyles[p.id]??={};this.data.settings.panelStyles[p.id][key]=Number(e.target.value);q('#'+out).textContent=e.target.value+' px';this.renderMarkersOnly();};}}
  startResize(e,el){if(!this.edit)return;e.preventDefault();e.stopPropagation();const p=this.data.panels.find(x=>x.id===el.dataset.id);if(!p)return;this.selected=p.id;const cfg=this.styleFor(p),startW=Number(cfg.width),startH=Number(cfg.height),rect=el.getBoundingClientRect(),scaleX=rect.width/startW||1,scaleY=rect.height/startH||1,x=e.clientX,y=e.clientY;const handle=e.currentTarget;handle.setPointerCapture(e.pointerId);const move=ev=>{const w=Math.max(32,Math.min(220,Math.round(startW+(ev.clientX-x)/scaleX))),h=Math.max(28,Math.min(180,Math.round(startH+(ev.clientY-y)/scaleY)));this.data.settings.panelStyles[p.id]??={};Object.assign(this.data.settings.panelStyles[p.id],{width:w,height:h});el.style.setProperty('--marker-width',w+'px');el.style.setProperty('--marker-height',h+'px');this.fitMarkerText();};const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);this.drag=null;this.render();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);this.drag=p.id;}
  updateMobileScale(){
    const roof=this.shadowRoot.querySelector('#roof');
    const viewport=this.shadowRoot.querySelector('.roofViewport');
    if(!roof||!viewport)return;
    // Markers and photo share one coordinate system. A marker's configured
    // dimensions are in desktop roof pixels; scale those dimensions to match
    // the *actual rendered* roof width on narrow screens. Never use the phone's
    // physical pixel size or a fixed minimum scale: both caused overlaps.
    const touchDevice=window.matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0;const mobile=touchDevice || (this instanceof TigoSolarCard && viewport.clientWidth<950) || window.matchMedia('(max-width:700px)').matches;
    const compact=this.data.settings.mobileCompact!==false;
    const baseWidth=mobile?1350:Math.max(1,viewport.clientWidth);
    const renderedWidth=roof.getBoundingClientRect().width;
    const factor=mobile&&compact?(renderedWidth/baseWidth)*(this instanceof TigoSolarCard ? .70 : .84):this.roofZoom/100;
    roof.style.setProperty('--mobile-marker-scale',String(Math.max(.08,Math.min(5,factor))));
  }
  isMobileRoof(){return window.matchMedia('(pointer:coarse)').matches || window.matchMedia('(max-width:700px)').matches;}
  fitRoofGeometry(){
    const viewport=this.shadowRoot.querySelector('.roofViewport');
    const roof=this.shadowRoot.querySelector('#roof');
    if(!viewport||!roof)return;
    const img=roof.querySelector('img');
    const ratio=img?.naturalWidth&&img?.naturalHeight?img.naturalWidth/img.naturalHeight:16/9;
    const available=Math.max(200,viewport.clientWidth);
    // Desktop: the roof container follows the image's intrinsic aspect ratio.
    // Mobile: keep a bounded viewport so pinch zoom and one-finger panning work.
    const mobile=this.isMobileRoof();
    const maxHeight=this instanceof TigoSolarCard ? Math.max(180,Math.min(900,Number(this.cardConfig?.height)||320)) : Math.max(260,Math.round(window.innerHeight*.84));
    const fitHeight=mobile?Math.min(maxHeight,Math.ceil(available/ratio)):Math.ceil(available/ratio);
    const fitWidth=mobile?Math.min(available,fitHeight*ratio):available;
    if(!mobile)this.roofZoom=100;
    viewport.style.height=(mobile?(this instanceof TigoSolarCard?maxHeight:Math.ceil(fitHeight)):Math.ceil(fitHeight))+'px';
    roof.style.aspectRatio=String(ratio);
    roof.style.width=(fitWidth*this.roofZoom/100)+'px';
    roof.style.height=(fitWidth*this.roofZoom/100/ratio)+'px';
    this.updateMobileScale();
    if(!this._roofFitPending){this._roofFitPending=true;requestAnimationFrame(()=>{this._roofFitPending=false;this.fitMarkerText();});}
  }
  setRoofZoom(value, center=false){
    const viewport=this.shadowRoot.querySelector('.roofViewport');
    const old=this.roofZoom;
    const next=Math.max(50,Math.min(500,Math.round(value/5)*5));
    if(!viewport || !this.isMobileRoof() || old===next)return;
    const relativeX=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,viewport.scrollWidth);
    const relativeY=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,viewport.scrollHeight);
    this.roofZoom=next;
    const roof=this.shadowRoot.querySelector('#roof');
    this.fitRoofGeometry();
    roof.style.setProperty('--roof-scale',String(next/100));
    this.updateMobileScale();
    const valueEl=this.shadowRoot.querySelector('#zoomValue');
    if(valueEl)valueEl.textContent=next+'%';const zoomInput=this.shadowRoot.querySelector('#zoomPercent');if(zoomInput&&document.activeElement!==zoomInput)zoomInput.value=next;
    // Preserve the current viewport center while zooming, including on mobile.
    viewport.scrollLeft=Math.max(0,relativeX*viewport.scrollWidth-viewport.clientWidth/2);
    viewport.scrollTop=Math.max(0,relativeY*viewport.scrollHeight-viewport.clientHeight/2);
  }
  setupZoom(){
    const viewport=this.shadowRoot.querySelector('.roofViewport');
    if(!viewport)return;
    viewport.addEventListener('touchstart',e=>{
      if(e.touches.length===2){this.pan=null;const [a,b]=e.touches;this.pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:this.roofZoom};}
    },{passive:true});
    viewport.addEventListener('touchmove',e=>{
      if(e.touches.length===2&&this.pinch){
        e.preventDefault();const [a,b]=e.touches;
        const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        this.setRoofZoom(this.pinch.zoom*distance/Math.max(1,this.pinch.distance));
      }
    },{passive:false});
    viewport.addEventListener('touchend',e=>{if(e.touches.length<2)this.pinch=null;},{passive:true});
    viewport.addEventListener('wheel',e=>{if(!this.isMobileRoof())return;e.preventDefault();this.setRoofZoom(this.roofZoom+(e.deltaY<0?10:-10));},{passive:false});
    // Drag the zoomed roof with one finger without scrolling the entire dashboard.
    // Edit mode retains pointer gestures for moving and resizing individual panels.
    viewport.addEventListener('pointerdown',e=>{if(this.edit||e.pointerType!=='touch'||this.pinch)return;this.pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};viewport.setPointerCapture(e.pointerId);});
    viewport.addEventListener('pointermove',e=>{const p=this.pan;if(!p||p.id!==e.pointerId||this.edit||this.pinch)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>5)p.moved=true;viewport.scrollLeft=p.left-dx;viewport.scrollTop=p.top-dy;});
    for(const event of ['pointerup','pointercancel'])viewport.addEventListener(event,e=>{if(this.pan?.id===e.pointerId){if(this.pan.moved)this.suppressTapUntil=Date.now()+350;this.pan=null;}});
    viewport.addEventListener('click',e=>{if(Date.now()<(this.suppressTapUntil||0)){e.preventDefault();e.stopPropagation();}},true);
  }
  // Fit the largest readable font inside each marker without changing its width/height.
  // Measure untransformed layout, so mobile roof zoom scales the photo and text together.
  fitMarkerText(){
    const canvas=this._fontCanvas||(this._fontCanvas=document.createElement('canvas'));
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    for(const el of this.shadowRoot.querySelectorAll('.marker')){
      const title=el.querySelector('.markerName');
      const readings=el.querySelector('.markerReadings');
      if(!title||!readings)continue;
      const rows=[...readings.querySelectorAll('small:not([hidden])')];
      const horizontal=el.classList.contains('horizontal');
      const w=el.clientWidth, h=el.clientHeight;
      if(w<=0||h<=0)continue;
      const innerW=Math.max(1,w-8),innerH=Math.max(1,h-6-(el.querySelector('.markerBar')?9:0));
      const texts=rows.map(row=>row.textContent||'');
      const titleText=title.hidden?'':(title.textContent||'');
      const fits=(font)=>{
        const titleSize=title.hidden?0:Math.min(28,font*1.18);
        ctx.font=`700 ${titleSize}px system-ui, sans-serif`;
        const titleWidth=ctx.measureText(titleText).width;
        ctx.font=`600 ${font}px system-ui, sans-serif`;
        const widest=Math.max(0,...texts.map(t=>ctx.measureText(t).width));
        const lineH=font*1.08;
        if(horizontal){
          const space=rows.length?3:0;
          return titleWidth+widest+space<=innerW &&
            Math.max(titleSize,rows.length*lineH)<=innerH;
        }
        return Math.max(titleWidth,widest)<=innerW &&
          titleSize+(rows.length?rows.length*lineH+1:0)<=innerH;
      };
      let lo=4,hi=30;
      // Binary search for the largest font that fits the actual text and field count.
      for(let i=0;i<12;i++){
        const mid=(lo+hi)/2;
        if(fits(mid))lo=mid;else hi=mid;
      }
      const size=Math.floor(lo*10)/10;
      el.style.setProperty('--field-font',size+'px');
      el.style.setProperty('--title-font',(title.hidden?0:Math.min(28,size*1.18))+'px');
    }
  }
  renderMarkersOnly(){for(const el of this.shadowRoot.querySelectorAll('.marker')){const p=this.data.panels.find(p=>p.id===el.dataset.id);if(!p)continue;const cfg=this.styleFor(p);const w=Math.max(32,Math.min(220,Number(cfg.width)||64)),h=Math.max(28,Math.min(180,Number(cfg.height)||64));const fields=this.data.settings.markerFields||['power'];el.style.setProperty('--marker-width',w+'px');el.style.setProperty('--marker-height',h+'px');el.style.setProperty('--field-font',Math.max(7,Math.min(15,Math.floor(Math.min(w/6,h/(fields.length+1))*.78)))+'px');el.classList.toggle('horizontal',cfg.layout==='horizontal');el.classList.toggle('vertical',cfg.layout!=='horizontal');}this.fitMarkerText();}
  startRotation(){clearInterval(this._rotationTimer);this._rotationTimer=setInterval(()=>{if(!this.data.settings.rotateFields||this.data.settings.markerFields.length<=Number(this.data.settings.rotateThreshold||3))return;this.carouselIndex=(this.carouselIndex+Number(this.data.settings.rotateThreshold||3))%this.data.settings.markerFields.length;this.updateRotation();},Math.max(1,Number(this.data.settings.rotateSeconds)||4)*1000);this.updateRotation();}
  updateRotation(){for(const el of this.shadowRoot.querySelectorAll('.markerReadings.rotating')){const rows=[...el.querySelectorAll('small')],count=rows.length;rows.forEach((row,i)=>row.hidden=!(Array.from({length:Math.min(count,Number(this.data.settings.rotateThreshold||3))},(_,j)=>j).some(j=>(this.carouselIndex+j)%count===i)));}this.fitMarkerText();}
  stringMetrics(string){const panels=this.data.panels.filter(p=>p.string===string);const onlinePanels=panels.filter(p=>this.num(p,'power')!==null);const vals=k=>onlinePanels.map(p=>this.num(p,k)).filter(v=>v!==null);const temperatures=vals('temperature'),powers=vals('power');return {count:panels.length,online:powers.length,total:powers.reduce((a,b)=>a+b,0),tempMin:temperatures.length?Math.min(...temperatures):null,tempMax:temperatures.length?Math.max(...temperatures):null,tempAvg:temperatures.length?temperatures.reduce((a,b)=>a+b,0)/temperatures.length:null,powerMin:powers.length?Math.min(...powers):null,powerMax:powers.length?Math.max(...powers):null,powerAvg:powers.length?powers.reduce((a,b)=>a+b,0)/powers.length:null};}
  stringDetail(){if(this.filter==='ALL')return '';const m=this.stringMetrics(this.filter);return `<section class="detail stringDetail"><h2>${this.t('Строка','String','סטרינג')} ${this.esc(this.filter)}</h2><div class="readings">${[['power',this.t('Общая мощность','Total power','הספק כולל'),m.total,'W'],['power',this.t('Средняя мощность панели','Average panel power','הספק ממוצע לפאנל'),m.powerAvg,'W'],['power',this.t('Минимальная мощность','Minimum power','הספק מינימלי'),m.powerMin,'W'],['power',this.t('Максимальная мощность','Maximum power','הספק מרבי'),m.powerMax,'W'],['temperature',this.t('Средняя температура','Average temperature','טמפרטורה ממוצעת'),m.tempAvg,'°C'],['temperature',this.t('Минимальная температура','Minimum temperature','טמפרטורה מינימלית'),m.tempMin,'°C'],['temperature',this.t('Максимальная температура','Maximum temperature','טמפרטורה מרבית'),m.tempMax,'°C']].map(([k,label,v,unit])=>`<div class="reading"><span>${label}</span><b>${this.fmt(v,1)} ${v===null?'':unit}</b></div>`).join('')}<div class="reading"><span>${this.t('На связи','Online','מחוברים')}</span><b>${m.online}/${m.count}</b></div></div></section>`;}
  summaryPanels(){
    const selection=this.summarySelection||{strings:[],panels:[]};
    const selectedStrings=selection.strings||[], selectedPanels=selection.panels||[];
    const isAll=!selectedStrings.length&&!selectedPanels.length;
    return this.data.panels.filter(p=>(isAll||selectedStrings.includes(p.string)||selectedPanels.includes(p.id))&&this.num(p,'power')!==null);
  }
  openEntityHistory(entityId){
    if(!entityId)return;
    const ev=new CustomEvent('hass-more-info',{detail:{entityId},bubbles:true,composed:true});
    const haRoot=document.querySelector('home-assistant');
    (haRoot||this).dispatchEvent(ev);
  }
  panelTrendMetrics(panel){
    const defs=[
      ['power',this.t('Мощность','Power','הספק'),'W'],
      ['voltage_in',this.t('Напряжение вход','Input voltage','מתח כניסה'),'V'],
      ['voltage_out',this.t('Напряжение выход','Output voltage','מתח יציאה'),'V'],
      ['current_in',this.t('Ток вход','Input current','זרם כניסה'),'A'],
      ['current_out',this.t('Ток выход','Output current','זרם יציאה'),'A'],
      ['temperature',this.t('Температура','Temperature','טמפרטורה'),'°C'],
      ['energy',this.t('Энергия','Energy','אנרגיה מצטברת'),'kWh'],
      ['rssi','RSSI','dBm']
    ];
    return defs.filter(([key])=>panel?.entities?.[key]);
  }
  trendColor(key){
    return ({power:'#ff8c2a',voltage_in:'#8b5cf6',voltage_out:'#14b8a6',current_in:'#eab308',current_out:'#ec4899',temperature:'#ef4444',energy:'#22c55e',rssi:'#0ea5e9'})[key]||'#64748b';
  }
  panelTrendCacheKey(panelId,key){return panelId+'|'+key;}
  async loadPanelTrend(keys=this.panelTrendSelection){
    const panel=this.data.panels.find(p=>p.id===this.selected)||this.data.panels[0];
    if(!panel){this.renderPanelTrend();return;}
    const wanted=(keys||[]).filter(k=>panel.entities?.[k]);
    const missing=wanted.filter(k=>!this.panelTrendCache[this.panelTrendCacheKey(panel.id,k)]);
    if(!missing.length){this.renderPanelTrend();return;}
    this.panelTrendLoading=true;this.panelTrendError='';this.renderPanelTrend();
    const end=new Date(),start=new Date(end.getTime()-86400000);
    try{
      await Promise.all(missing.map(async key=>{
        const entity=panel.entities[key];
        const url=`history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(entity)}&end_time=${encodeURIComponent(end.toISOString())}&minimal_response&no_attributes`;
        const raw=await this.hass.callApi('GET',url);
        const points=(raw?.[0]||[]).map(x=>({t:new Date(x.last_changed||x.last_updated).getTime(),v:Number(x.state)})).filter(x=>Number.isFinite(x.t)&&Number.isFinite(x.v));
        this.panelTrendCache[this.panelTrendCacheKey(panel.id,key)]=points;
      }));
    }catch(e){this.panelTrendError=String(e?.message||e);}
    this.panelTrendLoading=false;this.renderPanelTrend();
  }
  togglePanelTrend(key){
    const set=new Set(this.panelTrendSelection);
    set.has(key)?set.delete(key):set.add(key);
    this.panelTrendSelection=[...set];
    this.updatePanelTrendLegend();
    this.loadPanelTrend().catch(()=>{});
  }
  bindPanelTrend(){
    this.shadowRoot.querySelectorAll('[data-panel-trend]').forEach(el=>{
      el.onclick=()=>this.togglePanelTrend(el.dataset.panelTrend);
    });
    this.updatePanelTrendLegend();
    this.renderPanelTrend();
  }
  updatePanelTrendLegend(){
    const active=new Set(this.panelTrendSelection);
    this.shadowRoot.querySelectorAll('[data-panel-trend]').forEach(el=>{
      el.classList.toggle('active',active.has(el.dataset.panelTrend));
      el.setAttribute('aria-pressed',active.has(el.dataset.panelTrend)?'true':'false');
    });
  }
  nearestTrendPoint(points,t){
    if(!points?.length)return null;
    let lo=0,hi=points.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(points[mid].t<t)lo=mid+1;else hi=mid;}
    const a=points[lo],b=lo>0?points[lo-1]:null;
    return b&&Math.abs(b.t-t)<Math.abs(a.t-t)?b:a;
  }
  renderPanelTrend(){
    const host=this.shadowRoot.querySelector('#panelTrendChart');if(!host)return;
    const panel=this.data.panels.find(p=>p.id===this.selected)||this.data.panels[0];
    if(!panel){host.innerHTML='';return;}
    const defs=this.panelTrendMetrics(panel);
    const active=defs.filter(([key])=>this.panelTrendSelection.includes(key));
    if(!active.length){
      host.innerHTML=`<div class="trendEmpty">${this.t('Выбери датчики под графиком','Select sensors below the chart','בחרו חיישנים מתחת לגרף')}</div>`;
      return;
    }
    const series=active.map(([key,label,unit])=>({key,label,unit,color:this.trendColor(key),points:this.panelTrendCache[this.panelTrendCacheKey(panel.id,key)]||[]}));
    if(this.panelTrendLoading&&!series.some(x=>x.points.length)){
      host.innerHTML=`<div class="trendEmpty">${this.t('Загрузка истории…','Loading history…','טוען היסטוריה…')}</div>`;return;
    }
    if(this.panelTrendError&&!series.some(x=>x.points.length)){
      host.innerHTML=`<div class="trendEmpty">${this.esc(this.panelTrendError)}</div>`;return;
    }
    const valid=series.filter(x=>x.points.length);
    if(!valid.length){
      host.innerHTML=`<div class="trendEmpty">${this.t('Для выбранных датчиков история недоступна','History is unavailable for the selected sensors','אין היסטוריה לחיישנים שנבחרו')}</div>`;return;
    }
    const allTimes=valid.flatMap(x=>x.points.map(p=>p.t));
    const minT=Math.min(...allTimes),maxT=Math.max(...allTimes),span=Math.max(1,maxT-minT);
    const W=1000,H=270,L=58,R=38,T=18,B=42,plotW=W-L-R,plotH=H-T-B;
    const unitGroups={};
    for(const ser of valid){
      (unitGroups[ser.unit]??=[]).push(...ser.points.map(p=>p.v));
    }
    const scales={};
    for(const [unit,vals] of Object.entries(unitGroups)){
      let lo=Math.min(...vals),hi=Math.max(...vals);
      if(lo===hi){const pad=Math.max(1,Math.abs(lo)*.05);lo-=pad;hi+=pad;}
      else{const pad=(hi-lo)*.08;lo-=pad;hi+=pad;}
      scales[unit]={lo,hi};
    }
    const unitList=Object.keys(scales);
    const x=t=>L+(t-minT)/span*plotW;
    const y=(v,u)=>T+(scales[u].hi-v)/(scales[u].hi-scales[u].lo)*plotH;
    const grid=[0,1,2,3,4].map(i=>{const yy=T+i*plotH/4;return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="trendGrid"/>`;}).join('');
    const firstUnit=unitList[0],secondUnit=unitList[1];
    const leftLabels=firstUnit?[0,1,2,3,4].map(i=>{const v=scales[firstUnit].hi-i*(scales[firstUnit].hi-scales[firstUnit].lo)/4;const yy=T+i*plotH/4+4;return `<text x="${L-8}" y="${yy}" text-anchor="end" class="trendAxis">${this.fmt(v,1)}</text>`;}).join(''):'';
    const rightLabels=secondUnit?[0,1,2,3,4].map(i=>{const v=scales[secondUnit].hi-i*(scales[secondUnit].hi-scales[secondUnit].lo)/4;const yy=T+i*plotH/4+4;return `<text x="${W-R+8}" y="${yy}" text-anchor="start" class="trendAxis">${this.fmt(v,1)}</text>`;}).join(''):'';
    const paths=valid.map(ser=>{
      const pts=ser.points.map(p=>`${x(p.t).toFixed(1)},${y(p.v,ser.unit).toFixed(1)}`).join(' ');
      return `<polyline class="trendLine" data-trend-line="${ser.key}" fill="none" stroke="${ser.color}" points="${pts}"/>`;
    }).join('');
    const locale=this.language==='ru'?'ru-RU':this.language==='he'?'he-IL':'en-US';
    const ticks=[0,.25,.5,.75,1].map(frac=>{const ts=minT+span*frac;return `<text x="${x(ts)}" y="${H-12}" text-anchor="${frac===0?'start':frac===1?'end':'middle'}" class="trendAxis">${new Date(ts).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</text>`;}).join('');
    host.innerHTML=`<div class="trendCanvas"><svg id="panelTrendSvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${this.t('Тренд панели за 24 часа','Panel trend for the last 24 hours','מגמת הפאנל ב־24 השעות האחרונות')}">${grid}${leftLabels}${rightLabels}${paths}${ticks}<line id="panelTrendCursor" x1="0" y1="${T}" x2="0" y2="${T+plotH}" class="trendCursor" hidden/><rect id="panelTrendHit" x="${L}" y="${T}" width="${plotW}" height="${plotH}" fill="transparent"/></svg><div class="trendAxisTitles"><span>${this.esc(firstUnit||'')}</span><span>${this.esc(secondUnit||'')}</span></div></div><div id="panelTrendReadout" class="trendReadout">${unitList.length>2?this.t('Для 3+ единиц каждая серия масштабируется по своей шкале.','With 3+ units, each series uses its own scale.','ב־3 יחידות ומעלה כל סדרה משתמשת בסקאלה משלה.') : this.t('Наведи мышь на график для значений','Hover over the chart to inspect values','עברו עם העכבר על הגרף להצגת ערכים')}</div>`;
    const svg=host.querySelector('#panelTrendSvg'),hit=host.querySelector('#panelTrendHit'),cursor=host.querySelector('#panelTrendCursor'),readout=host.querySelector('#panelTrendReadout');
    if(!svg||!hit||!cursor||!readout)return;
    const inspect=ev=>{
      const rect=svg.getBoundingClientRect();
      const px=(ev.clientX-rect.left)/rect.width*W;
      const clamped=Math.max(L,Math.min(W-R,px));
      const ts=minT+(clamped-L)/plotW*span;
      cursor.hidden=false;cursor.setAttribute('x1',clamped);cursor.setAttribute('x2',clamped);
      const when=new Date(ts).toLocaleString(locale,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const values=valid.map(ser=>{const p=this.nearestTrendPoint(ser.points,ts);return p?`<span><i style="--trend-color:${ser.color}"></i><b>${this.esc(ser.label)}</b> ${this.fmt(p.v,1)} ${this.esc(ser.unit)}</span>`:'';}).join('');
      readout.innerHTML=`<strong>${when}</strong>${values}`;
    };
    hit.addEventListener('pointermove',inspect);
    hit.addEventListener('pointerdown',inspect);
    hit.addEventListener('pointerleave',()=>{cursor.hidden=true;});
  }
  bindSummaryHistory(){
    this.shadowRoot.querySelectorAll('[data-summary-history]').forEach(el=>{
      el.onclick=()=>this.showSummaryHistory(el.dataset.summaryHistory,el.dataset.summaryStat);
    });
  }
  async showSummaryHistory(metric,stat){
    const panels=this.summaryPanels().filter(p=>p.entities?.[metric]);
    if(!panels.length)return;
    const values=panels.map(p=>({p,v:this.num(p,metric)})).filter(x=>x.v!==null);
    if(!values.length)return;
    let target;
    if(stat==='min') target=values.reduce((a,b)=>b.v<a.v?b:a);
    else if(stat==='max') target=values.reduce((a,b)=>b.v>a.v?b:a);
    else {
      const avg=values.reduce((a,b)=>a+b.v,0)/values.length;
      target=values.reduce((a,b)=>Math.abs(b.v-avg)<Math.abs(a.v-avg)?b:a);
    }
    const entityId=target?.p?.entities?.[metric];
    if(!entityId)return;
    this.openEntityHistory(entityId);
  }
  summaryDetail(){
    const allStrings=[...new Set(this.data.panels.map(p=>p.string))].sort();
    const selection=this.summarySelection||{strings:[],panels:[]};
    const selectedStrings=selection.strings||[];
    const selectedPanels=selection.panels||[];
    const isAll=!selectedStrings.length&&!selectedPanels.length;
    const panels=this.summaryPanels();
    const fields=(this.data.settings.summaryMetrics||[]).filter(k=>['power','temperature','voltage_in','voltage_out','current_in','current_out','energy','rssi'].includes(k));
    if(!fields.length)return '';
    const units={power:'W',temperature:'°C',voltage_in:'V',voltage_out:'V',current_in:'A',current_out:'A',energy:'kWh',rssi:'dBm'};
    const rows=fields.map(k=>{const values=panels.map(p=>this.num(p,k)).filter(v=>v!==null);const label=this.fieldLabel(k);const stats=values.length?[[this.t('Минимум','Minimum','מינימום'),Math.min(...values)],[this.t('Максимум','Maximum','מקסימום'),Math.max(...values)],[this.t('Среднее','Average','ממוצע'),values.reduce((a,b)=>a+b,0)/values.length]]:[];return `<div class="summaryMetric"><b>${this.esc(label)}</b><div class="summaryReadings">${stats.map(([name,v],i)=>`<button class="reading summaryStat" data-summary-history="${k}" data-summary-stat="${['min','max','avg'][i]}" title="${this.t('Открыть график за 24 часа','Open 24-hour chart','פתיחת גרף ל־24 שעות')}"><span>${name}</span><b>${this.fmt(v,1)} ${units[k]}</b></button>`).join('')||`<div class="muted">${this.t('Нет данных','No data','אין נתונים')}</div>`}</div></div>`;}).join('');
    const scope=isAll?this.t('Все панели','All panels','כל הפאנלים'):[...selectedStrings.map(x=>this.t('Строка','String','סטרינג')+' '+x),...selectedPanels].join(', ');
    return `<section class="detail summaryDetail"><h2>${this.t('Статистика выбранных панелей','Selected panel statistics','נתוני הפאנלים שנבחרו')}</h2><div class="muted">${this.esc(scope)} · ${panels.length} ${this.t('панелей','panels','פאנלים')}</div><div class="summaryMetrics">${rows}</div></section>`;
  }
  summarySelector(strings,panels){
    const sel=this.summarySelection||{strings:[],panels:[]};
    const all=!sel.strings.length&&!sel.panels.length;
    return `<section class="summarySelector"><div class="sectionTitle">${this.t('Выбор для статистики','Statistics selection','בחירת פאנלים לסטטיסטיקה')}</div><div class="summaryChoices"><button class="btn ${all?'primary':''}" id="summaryAll">${this.t('Все панели','All panels','כל הפאנלים')}</button>${strings.map(st=>`<label><input type="checkbox" data-summary-pick-string="${this.esc(st)}" ${sel.strings.includes(st)?'checked':''}> ${this.t('Строка','String','סטרינג')} ${this.esc(st)}</label>`).join('')}</div><details class="summaryPanelPicker"><summary>${this.t('Выбрать отдельные панели','Choose individual panels','בחירת פאנלים בודדים')} (${sel.panels.length})</summary><div class="summaryChoices">${strings.map(st=>`<div class="summaryPanelGroup"><b>${this.t('Строка','String','סטרינג')} ${this.esc(st)}</b><div>${panels.filter(p=>p.string===st).map(p=>`<label><input type="checkbox" data-summary-pick-panel="${this.esc(p.id)}" ${sel.panels.includes(p.id)?'checked':''}>${this.esc(p.id)}</label>`).join('')}</div></div>`).join('')}</div></details></section>`;
  }
  updateStringDetail(){const host=this.shadowRoot.querySelector('.stringDetail');if(host)host.outerHTML=this.stringDetail();}
  updateMarkers(){for(const el of this.shadowRoot.querySelectorAll('.marker')){const p=this.data.panels.find(p=>p.id===el.dataset.id);if(!p)continue;const c=this.markerColor(p);el.style.background=c.background;el.style.borderColor=c.border;el.classList.toggle('offline',this.num(p,'power')===null);}}
  render(){this.ensureSettings();const panels=this.data.panels,strings=[...new Set(panels.map(p=>p.string))].sort(),selected=panels.find(p=>p.id===this.selected)||panels[0];if(selected&&!this.selected)this.selected=selected.id;const visible=this.filter==='ALL'?panels:panels.filter(p=>p.string===this.filter);const sum=panels.map(p=>this.num(p,'power')).filter(x=>x!==null).reduce((a,b)=>a+b,0);const online=panels.filter(p=>this.val(p,'power')!==null).length;
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;color:#e7edf5;font:14px system-ui,-apple-system,Segoe UI,sans-serif;min-height:100%;background:#101923}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.45}.app{padding:24px;max-width:1800px;margin:auto}.head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:24px}.head h1{margin:0;font-size:27px;letter-spacing:-.5px}.subtitle,.muted{color:#95a9bd}.head .subtitle{margin-top:4px}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{border:1px solid #425369;background:#253446;color:#e7edf5;padding:9px 13px;border-radius:9px}.btn:hover{background:#35485d}.primary{background:#137e64;border-color:#199a7b}.primary:hover{background:#169778}.danger{background:#66343a}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.tile,.panel,.detail,.string{background:#192632;border:1px solid #2d4052;border-radius:15px;padding:18px}.tile label,.string label{display:block;color:#9ab0c3;font-size:12px;letter-spacing:1px;text-transform:uppercase}.tile strong{display:block;font-size:27px;margin-top:8px}.strings{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.string{min-width:155px;flex:1;cursor:pointer}.string.active{border-color:#34d399}.string b{display:block;font-size:21px;margin:8px 0}.main{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(300px,1fr);gap:16px}.sectionTitle{font-size:18px;font-weight:700;margin-bottom:12px}.roof{position:relative;width:100%;aspect-ratio:16/9;background:#111b25;border:1px dashed #3b5365;border-radius:12px;overflow:hidden;touch-action:none}.roof img{width:100%;height:100%;object-fit:contain;pointer-events:none}.empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#94aabe;padding:25px}.marker{position:absolute;width:var(--marker-width,64px);height:var(--marker-height,64px);min-width:0;max-width:none;overflow:hidden;transform:translate(-50%,-50%) scale(var(--mobile-marker-scale,1));border:1px solid #34d399;background:#115a4de6;color:white;border-radius:8px;padding:5px;display:flex;flex-direction:column;align-items:center;gap:1px;box-shadow:0 3px 10px #0007;z-index:1;user-select:none;touch-action:none}.markerName[hidden]{display:none!important}.marker small{font-size:var(--field-font,10px);line-height:1.05;color:#e6fff2;white-space:nowrap}.marker span{font-size:clamp(9px,var(--field-font,10px),18px);line-height:1.05;font-weight:700}.marker.horizontal{flex-direction:row;justify-content:center}.marker.vertical{flex-direction:column;justify-content:center}.markerReadings{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;overflow:hidden;gap:0}.marker.horizontal .markerReadings{align-items:flex-start}.marker.offline{background:#6d3d3fe6;border-color:#e18c8c}.marker.selected{outline:2px solid white;z-index:2}.marker.movable{cursor:grab}.marker.movable:active{cursor:grabbing}.roof.editing{outline:2px solid #fbbf24}.roofcontrols{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin:13px 0}.file{display:inline-block;cursor:pointer}.file input{display:none}.details h2{margin:0 0 6px}.details .muted{margin-bottom:18px}.readings{display:grid;grid-template-columns:1fr 1fr;gap:9px}.reading{border:1px solid #2b4052;background:#14212d;padding:11px;border-radius:9px}.reading span{display:block;color:#9bb1c4;font-size:12px;margin-bottom:5px}.reading b{font-size:18px}.history{margin-top:20px}.history svg{width:100%;height:135px}.chartlabels{display:flex;justify-content:space-between;color:#91a5b7;font-size:11px}.groupList{display:grid;gap:12px;margin-top:16px}.groupTitle{font-size:13px;font-weight:750;color:#bbd4e2;margin:0 0 7px}.list{display:flex;flex-wrap:wrap;gap:7px}.chip{border:1px solid #425569;background:#253647;color:#e7edf5;padding:7px 10px;border-radius:8px}.chip.active{border-color:#34d399}.notice{padding:9px 12px;background:#213e40;border-radius:8px;margin-bottom:14px}.help{line-height:1.6;color:#a4b8ca;font-size:12px;margin-top:12px}.settings{display:flex;align-items:center;gap:8px}.displaySettings{margin:12px 0;padding:14px;border:1px solid #425569;border-radius:10px;background:#152330}.displaySettings label{display:flex;align-items:center;gap:8px}.fieldOptions{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}.sizeControl{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.sizeControl input{max-width:240px;flex:1}.roofViewport{width:100%;overflow:auto;overscroll-behavior:contain;border-radius:12px}.roof{min-width:0}.mobileTip{display:none}.settings select{background:#263747;color:#fff;border:1px solid #405368;border-radius:7px;padding:8px}@media(max-width:1000px){.main{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.app{padding:10px}.head{gap:10px;margin-bottom:14px}.head h1{font-size:23px}.actions{gap:6px}.btn{padding:9px 10px;min-height:40px}.kpis{gap:7px}.tile,.panel,.detail,.string{padding:11px;border-radius:11px}.tile strong{font-size:21px}.strings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.string{min-width:0}.string b{font-size:17px}.main{display:flex;flex-direction:column}.roofViewport{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}.roof{min-width:680px;aspect-ratio:16/9}.mobileTip{display:block;color:#9ab0c3;font-size:12px;margin:6px 0}.marker{padding:4px}.readings{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.reading{padding:9px;min-width:0;overflow-wrap:anywhere}.reading b{font-size:15px}.detail{order:2}.chip{min-height:36px}.groupList{gap:16px}}@media(max-width:380px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.tile strong{font-size:18px}.readings{grid-template-columns:1fr 1fr}}

      .scopeControls{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0}.scopeControls select{background:#263747;color:#fff;border:1px solid #405368;border-radius:7px;padding:8px;min-width:125px}.marker{width:var(--marker-size,64px);height:var(--marker-size,64px);min-width:0;max-width:none;padding:2px 3px;gap:0;justify-content:center;overflow:hidden;line-height:1.05}.marker>span:first-child{display:block;flex:none;font-size:clamp(8px,calc(var(--marker-size) * .18),16px);line-height:1.05}.markerReadings{display:flex;flex-direction:column;gap:0;width:100%;min-height:0;overflow:hidden;justify-content:center;align-items:center}.marker .markerReadings small{display:block;font-size:var(--field-font,9px);line-height:1;white-space:nowrap;overflow:hidden;text-overflow:clip;max-width:100%;font-variant-numeric:tabular-nums}.marker.horizontal{flex-direction:row;gap:2px}.marker.horizontal>span:first-child{font-size:clamp(8px,calc(var(--marker-size) * .16),15px)}.marker.horizontal .markerReadings{flex:1;min-width:0;align-items:flex-start}.marker.horizontal .markerReadings small{max-width:100%}@media(max-width:700px){.scopeControls{gap:8px}.scopeControls label{flex-wrap:wrap}.scopeControls select{min-width:105px}.marker{padding:2px}}

      /* Independent width and height. Compact text never expands a marker. */
      .marker{width:var(--marker-width,64px);height:var(--marker-height,64px);min-width:0;min-height:0;max-width:none;max-height:none;gap:0;padding:1px 2px;line-height:1;overflow:hidden}
      .marker>span:first-child{font-size:var(--title-font,12px);line-height:1;flex-shrink:0}
      .markerReadings{display:flex;flex-direction:column;gap:0;min-height:0;min-width:0;overflow:hidden;justify-content:center}
      .marker .markerReadings small{font-size:var(--field-font,9px);line-height:1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:clip}
      .marker.horizontal{flex-direction:row;gap:2px}.marker.horizontal .markerReadings{flex:1;align-items:flex-start}
      .sizeControls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:12px 0}
      .sizeControls .sizeControl{display:flex;flex-direction:column;align-items:stretch;gap:5px}.sizeControls input{width:100%;max-width:none}
      @media(max-width:700px){.roof{min-width:0}.mobileTip{line-height:1.45}.roofcontrols .btn{font-size:12px}.sizeControls{grid-template-columns:1fr}.marker{padding:1px}}
      .roofViewport{overflow:auto;overscroll-behavior:contain;max-width:100%;touch-action:pan-x pan-y;scrollbar-width:thin}
      .roof{flex-shrink:0;--roof-scale:1}
      .zoomControls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}
      .zoomControls button{min-width:40px;min-height:40px}
      .zoomControls output{min-width:48px;text-align:center;font-weight:700}
      .compactToggle{display:none;align-items:center;gap:6px;font-size:12px;color:#bbd4e2}
      @media(max-width:700px){.compactToggle{display:flex}.zoomControls{gap:6px}.zoomControls button{min-width:38px}}
      .marker{position:absolute}.markerBar{position:absolute;bottom:2px;left:5px;right:5px;height:5px;border-radius:5px;background:#0008;overflow:hidden;display:block!important}.markerBarFill{display:block;height:100%;background:linear-gradient(90deg,#9be7c4,#f0f77e);border-radius:5px;transition:width .25s}.resizeHandle{position:absolute;right:0;bottom:0;width:19px;height:19px;display:flex;align-items:center;justify-content:center;background:#fbbf24;color:#17212a;font-size:14px;font-weight:900;border-radius:6px 0 0 0;cursor:nwse-resize;touch-action:none;z-index:4}.marker:has(.resizeHandle) .markerBar{right:21px}.quickEdit{border:1px solid #3b5a67;background:#152b36;padding:13px;border-radius:10px;margin:12px 0}.quickGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.quickGrid label{display:flex;flex-direction:column;gap:5px;min-width:0}.quickGrid input{width:100%;min-width:0;background:#263747;color:#fff;border:1px solid #456074;border-radius:6px;padding:7px}.quickGrid input[type=range]{padding:0}@media(max-width:700px){.quickGrid{grid-template-columns:1fr}.resizeHandle{width:24px;height:24px}}

      /* v2: full-width roof, compact summary and two-row detail tiles. */
      .kpis{gap:7px;margin-bottom:8px}.tile{padding:9px 12px;border-radius:9px}.tile label,.string label{font-size:10px;letter-spacing:.6px}.tile strong{font-size:19px;margin-top:3px}
      .strings{gap:7px;margin-bottom:10px}.string{padding:8px 12px;border-radius:9px;min-width:0}.string b{font-size:16px;margin:3px 0}
      .main{display:flex;flex-direction:column;gap:12px}.main>.panel,.main>.detail{width:100%;min-width:0}
      .readings{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.reading{min-width:0;padding:9px;overflow-wrap:anywhere}.reading span{font-size:11px}.reading b{font-size:15px}
      .roofViewport{position:relative;overflow:auto;overscroll-behavior:contain;touch-action:none;max-height:none;-webkit-overflow-scrolling:touch}
      .roof{min-width:0;aspect-ratio:16/9}.roof img{display:block}
      .zoomPercent{width:76px;min-height:39px;text-align:center;border:1px solid #425369;background:#253446;color:#e7edf5;border-radius:8px}
      @media(max-width:700px){.app{padding:8px}.kpis{gap:5px}.tile{padding:8px}.tile strong{font-size:17px}.strings{gap:5px}.string{padding:8px}.string b{font-size:15px}.roof{min-width:0}.roofViewport{max-height:65vh}.readings{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.reading{padding:7px}.reading b{font-size:13px}.detail{order:initial}.zoomControls{position:sticky;bottom:0;background:#192632e8;padding:5px;border-radius:8px;z-index:4}}
    
/* Native Home Assistant theme: honor the active light/dark theme and custom theme tokens. */
:host{color:var(--primary-text-color,#e7edf5);background:var(--primary-background-color,#101923);font-family:var(--paper-font-body1_-_font-family,system-ui,-apple-system,Segoe UI,sans-serif)}
.app{color:var(--primary-text-color,#e7edf5)}
.subtitle,.muted,.help,.mobileTip,.chartlabels{color:var(--secondary-text-color,#95a9bd)}
.tile,.panel,.detail,.string,.groupList{background:var(--card-background-color,#192632);border-color:var(--divider-color,#2d4052);color:var(--primary-text-color,#e7edf5)}
.tile label,.string label,.groupTitle,.reading span{color:var(--secondary-text-color,#9ab0c3)}
.btn,.chip,.settings select,.displaySettings select,.zoomPercent{background:var(--secondary-background-color,#253446);border-color:var(--divider-color,#425369);color:var(--primary-text-color,#e7edf5)}
.btn:hover,.chip:hover{background:var(--state-icon-color,var(--secondary-background-color,#35485d))}
.primary{background:var(--primary-color,#137e64);border-color:var(--primary-color,#199a7b);color:var(--text-primary-color,#fff)}
.primary:hover{filter:brightness(1.1);background:var(--primary-color,#169778)}
.danger{background:var(--error-color,#a54c53);color:var(--text-primary-color,#fff)}
.reading,.displaySettings{background:var(--secondary-background-color,#14212d);border-color:var(--divider-color,#2b4052)}
.summaryStat{display:block;width:100%;text-align:left;color:var(--primary-text-color);font:inherit;cursor:pointer}.panelTrend{margin-top:16px}.panelTrendTitle{font-size:15px;font-weight:750;margin-bottom:8px}.panelTrendChart{border:1px solid var(--divider-color,#d8dde3);border-radius:10px;background:var(--card-background-color,#fff);padding:6px;min-height:250px}.trendCanvas{position:relative}.panelTrendChart svg{display:block;width:100%;height:270px;overflow:visible}.trendGrid{stroke:var(--divider-color,#d8dde3);stroke-width:1}.trendAxis{fill:var(--secondary-text-color,#6b7280);font-size:11px}.trendLine{stroke-width:3;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}.trendCursor{stroke:var(--primary-text-color,#111827);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke;pointer-events:none}.trendAxisTitles{display:flex;justify-content:space-between;padding:0 10px;color:var(--secondary-text-color,#6b7280);font-size:11px}.trendReadout{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-height:34px;padding:7px 10px;color:var(--secondary-text-color,#6b7280);font-size:12px}.trendReadout strong{color:var(--primary-text-color)}.trendReadout span{display:inline-flex;align-items:center;gap:4px}.trendReadout i,.trendLegendBtn i{width:9px;height:9px;border-radius:50%;background:var(--trend-color);display:inline-block;flex:none}.trendEmpty{min-height:238px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--secondary-text-color,#6b7280);padding:20px}.panelTrendLegend{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:9px}.trendLegendBtn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--divider-color,#d8dde3);border-radius:999px;padding:6px 10px;background:var(--card-background-color,#fff);color:var(--secondary-text-color,#6b7280);font:inherit;font-size:12px;cursor:pointer;opacity:.48}.trendLegendBtn.active{opacity:1;color:var(--primary-text-color);border-color:var(--trend-color);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--trend-color) 55%,transparent)}.trendLegendBtn small{font-size:10px;opacity:.7}.trendLegendBtn:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}@media(max-width:700px){.panelTrendChart svg{height:230px}.trendLegendBtn{padding:7px 9px}.panelTrendChart{min-height:218px}}.summaryStat:hover{border-color:var(--primary-color);filter:brightness(1.08)}.summaryStat:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.summaryChartShade{position:fixed;inset:0;background:#0009;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px}.summaryChartDialog{width:min(1000px,96vw);background:var(--card-background-color,#192632);border:1px solid var(--divider-color,#2d4052);border-radius:14px;padding:18px}.summaryChartDialog svg{width:100%;height:300px;margin-top:15px}.summaryChartHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.reading b{color:var(--primary-text-color,#e7edf5)}
.roof,.roofViewport{background:var(--secondary-background-color,#111b25);border-color:var(--divider-color,#3b5365)}
.notice{background:var(--secondary-background-color,#213e40);color:var(--primary-text-color,#e7edf5)}
.string.active,.chip.active{border-color:var(--primary-color,#34d399)}
/* v2.3: mobile viewport remains fixed while zoomed image scrolls inside. */
.version{font-size:12px;font-weight:500;opacity:.7;vertical-align:middle}.editorMenu{margin:12px 0}.editorTools[hidden],.editorMenu[hidden]{display:none!important}.markerReadings small[hidden]{display:none!important}.chartReadout{font-weight:700;margin:6px 0}.roofViewport{height:auto;min-height:250px;max-height:none!important}.zoomControls .btn{padding:5px 8px;min-width:0;min-height:32px}.zoomPercent{min-height:32px}.head .actions .btn{padding:7px 12px}@media(max-width:700px){.roofViewport{height:auto;min-height:210px;max-height:none!important}.zoomControls .btn{padding:5px 8px;min-height:32px}.editorMenu .actions{display:flex;flex-wrap:wrap}}
.unifiedSave{display:flex;justify-content:flex-end;margin:16px 0 4px;padding:12px 0;border-top:1px solid var(--divider-color,#3b4855)}.unifiedSave .btn{min-width:180px}.displaySettings{margin-top:14px}.editorMenu,.roofcontrols{margin-top:12px}.widgetExport{display:block;margin:0 0 8px auto;padding:6px 10px;border:1px solid var(--primary-color,#03a9f4);border-radius:8px;color:var(--primary-text-color);background:var(--card-background-color);cursor:pointer;font-size:12px}.widgetExport[hidden]{display:none!important}.kpis,.strings{position:relative}.kpis>.widgetExport,.strings>.widgetExport{grid-column:1/-1}.widgetShade{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}.widgetDialog{width:min(450px,100%);max-height:90vh;overflow:auto;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:14px;padding:22px;box-shadow:0 12px 48px #0005}.widgetDialog label{display:block;margin:14px 0}.widgetDialog select{display:block;width:100%;padding:10px;margin-top:6px;color:var(--primary-text-color);background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:8px}.widgetActions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.widgetError{color:var(--error-color,#e53935);overflow-wrap:anywhere}.summaryDetail{margin:0 0 14px}.summaryMetrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px}.summaryMetric{min-width:0}.summaryReadings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}.summaryReadings .reading{min-width:0;padding:8px}.summaryReadings .reading b{font-size:14px}@media(max-width:700px){.summaryMetrics{grid-template-columns:1fr}.summaryReadings .reading{padding:7px}}/* Order: full-width roof, selected-panel details, then string panel selectors. */
.main{display:flex;flex-direction:column;gap:12px}
.main>.panel,.main>.detail,.main>.groupList{width:100%;min-width:0}
.groupList{border:1px solid var(--divider-color,#2d4052);border-radius:15px;padding:14px;margin-top:0}
.readings{grid-template-columns:repeat(6,minmax(0,1fr))}
@media(max-width:1000px){.readings{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.readings{grid-template-columns:repeat(2,minmax(0,1fr))}.groupList{padding:11px}}
/* v2.7: compact selected-panel and string readings, aligned to the left. */
.detail .readings{display:grid;grid-template-columns:repeat(auto-fill,92px);justify-content:start;gap:5px}
.detail .reading{padding:6px;min-width:0;min-height:43px;border-radius:7px}
.detail .reading span{font-size:10px;line-height:1.15;margin-bottom:3px}
.detail .reading b{font-size:13px;line-height:1.2;overflow-wrap:anywhere}
@media(max-width:700px){.detail .readings{grid-template-columns:repeat(auto-fill,92px);gap:5px}.detail .reading{min-height:43px;padding:6px}}

.summarySelector{margin:0 0 12px;padding:12px;background:var(--card-background-color);border:1px solid var(--divider-color,#ccc);border-radius:12px}.summarySelector .sectionTitle{margin-bottom:8px}.summaryChoices{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.summaryChoices label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}.summaryPanelPicker{margin-top:8px}.summaryPanelPicker summary{cursor:pointer;color:var(--primary-color,#03a9f4)}.summaryPanelPicker>.summaryChoices{padding-top:10px}.summaryPanelGroup{width:100%;margin:4px 0}.summaryPanelGroup>div{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px}.summaryMetrics{display:flex;flex-wrap:wrap;gap:10px}.summaryMetric{min-width:190px;flex:1}.summaryReadings{display:flex;gap:5px;flex-wrap:wrap}.summaryReadings>.reading{min-width:85px;flex:1}@media(max-width:600px){.summarySelector{padding:9px}.summaryMetric{min-width:140px}}

/* v2.17: persist summary metrics; mobile zoom control is automatic. */
@media (pointer:coarse), (max-width:700px){.desktopOnly{display:none!important}}
/* v2.16: selection and statistics live together immediately above the roof. */
.compactStrings{display:flex!important;flex-wrap:wrap;align-items:stretch;gap:7px;margin:0 0 8px!important}
.compactStrings>.string{flex:0 1 158px!important;min-width:118px!important;max-width:185px!important;padding:7px 10px!important;min-height:60px;cursor:pointer}
.compactStrings>.string label{font-size:10px!important;letter-spacing:.2px!important;pointer-events:none}
.compactStrings>.string b{font-size:15px!important;margin:3px 0!important;line-height:1.2}
.compactStrings>.string .muted{font-size:11px}
.compactStrings>.inlinePanelPicker{flex:0 0 auto;align-self:stretch;position:relative;min-width:150px;max-width:100%;border:1px solid var(--divider-color,#ccc);border-radius:9px;padding:10px;background:var(--card-background-color)}
.inlinePanelPicker summary{cursor:pointer;font-size:12px;font-weight:600;color:var(--primary-text-color)}
.inlinePanelPicker[open]{flex-basis:100%;max-width:100%}
.inlinePanelGroups{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}
.inlinePanelGroup{min-width:180px;flex:1}
.inlinePanelGroup>div{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.inlinePanelGroup label{display:inline-flex;align-items:center;gap:3px;border:1px solid var(--divider-color,#ccc);border-radius:6px;padding:5px;font-size:11px;cursor:pointer}
.summaryDetail{margin:0 0 10px!important;padding:10px!important}
.summaryDetail h2{font-size:15px!important;margin:0 0 3px!important}
.summaryMetrics{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))!important;gap:7px!important;margin-top:8px!important}
.summaryReadings .reading{padding:6px!important}
@media(max-width:700px){.compactStrings>.string{flex:1 1 calc(50% - 5px)!important;max-width:none!important;min-width:0!important}.compactStrings>.inlinePanelPicker{flex:1 1 100%}.summaryMetrics{grid-template-columns:1fr!important}}

${this.viewMode==='roof'?':host{min-height:0}.app>.kpis,.app>.strings,.app>.main>.detail,.app>.main>.groupList,.app>.head,.app>.summaryDetail,.app>.summarySelector{display:none!important} .app{padding:0} .main>.panel{padding:8px} .mobileTip{display:none} .roofViewport{min-height:0!important}':this.viewMode==='stats'?'.app>.head,.app>.summaryDetail,.app>.summarySelector,.app>.main{display:none!important}.app{padding:0}':this.viewMode==='detail'?'.app>.head,.app>.summaryDetail,.app>.summarySelector,.app>.kpis,.app>.strings,.app>.main>.panel,.app>.main>.groupList,.app>.main>.stringDetail{display:none!important}.app{padding:0}':this.viewMode==='strings'?'.app>.head,.app>.kpis,.app>.main>.panel,.app>.main>.detail:not(.stringDetail){display:none!important}.app{padding:0}':''}/* Zoom controls are mobile-only; desktop always fits the whole image. */
      .mobileZoomOnly{display:none!important}
      @media (max-width:700px),(pointer:coarse){.mobileZoomOnly{display:flex!important}}
      .roofViewport{max-width:100%}
      </style><div class="app" dir="${this.language==='he'?'rtl':'ltr'}"><div class="head"><div><h1>☀️ Tigo Solar <span class="version">v2.23.12</span></h1><div class="subtitle">${this.t('Мониторинг оптимизаторов Tigo','Tigo optimizer monitoring','ניטור אופטימייזרים של Tigo')}</div></div><div class="actions"><button class="btn" id="addWidgetGlobal" ${this.editorOpen?'':'hidden'}>${this.t('Добавить виджет на другой Dashboard','Add widget to another dashboard','הוספת כרטיס ללוח בקרה אחר')}</button><button class="btn" id="editorToggle">⚙ ${this.t('Редактирование','Edit','עריכה')}</button><div class="settings"><select id="language" aria-label="${this.t('Язык','Language','שפה')}"><option value="ru" ${this.language==='ru'?'selected':''}>RU</option><option value="en" ${this.language==='en'?'selected':''}>EN</option><option value="he" ${this.language==='he'?'selected':''}>HE</option></select></div></div></div>
    ${this.message?`<div class="notice">${this.esc(this.message)}</div>`:''}
    <div class="kpis"><div class="tile"><label>${this.t('Мощность','Total power','הספק')}</label><strong id="total">${panels.length?this.fmt(sum/1000,2)+' kW':'—'}</strong></div><div class="tile"><label>${this.t('Панели','Panels','פאנלים')}</label><strong>${panels.length}</strong></div><div class="tile"><label>${this.t('На связи','Online','מחוברים')}</label><strong id="online">${online} / ${panels.length}</strong></div><div class="tile"><label>${this.t('Строки','Strings','סטרינגים')}</label><strong>${strings.length}</strong></div></div>
    <div class="strings compactStrings"><div class="string ${!this.summarySelection.strings.length&&!this.summarySelection.panels.length?'active':''}" data-filter="ALL" role="button" tabindex="0"><label>${this.t('Все строки','All strings','כל הסטרינגים')}</label><b>${panels.length} ${this.t('панелей','panels','פאנלים')}</b></div>${strings.map(s=>`<div class="string ${this.summarySelection.strings.includes(s)?'active':''}" data-filter="${this.esc(s)}" role="button" tabindex="0"><label>${this.t('Строка','String','סטרינג')} ${this.esc(s)}</label><b data-string-total="${this.esc(s)}">${this.fmt(panels.filter(p=>p.string===s).map(p=>this.num(p,'power')).filter(x=>x!==null).reduce((a,b)=>a+b,0)/1000,2)} kW</b><span class="muted">${panels.filter(p=>p.string===s).length} ${this.t('панелей','panels','פאנלים')}</span></div>`).join('')}</div>
    ${this.summaryDetail()}<div class="main"><section class="panel"><div class="sectionTitle">${this.t('Карта крыши','Roof layout','מפת הגג')}</div><div class="mobileTip">${this.t('Увеличивайте и уменьшайте карту кнопками или двумя пальцами. Масштабируются фото и панели вместе.','Zoom the roof with buttons or two fingers. The photo and markers scale together.','אפשר להגדיל ולהקטין באמצעות הכפתורים או בצביטה בשתי אצבעות. התמונה וסמני הפאנלים משתנים יחד.')}</div><div class="roofViewport"><div class="roof ${this.edit?'editing':''}" id="roof" style="--marker-size:${this.data.settings.markerSize}px;--roof-scale:${this.roofZoom/100};">${this.data.roof?`<img src="${this.esc(this.data.roof)}" alt="Roof">`:`<div class="empty">${this.t('Загрузите фотографию крыши или разместите панели на пустой схеме','Upload a roof photo or arrange panels on the blank layout','העלו תמונת גג או מקמו את הפאנלים על תרשים ריק')}</div>`}${visible.map((p,i)=>this.marker(p,panels.indexOf(p))).join('')}</div></div><div class="zoomControls mobileZoomOnly"><button class="btn" id="zoomOut" title="Zoom out">−</button><label>${this.t('Масштаб','Zoom','תקריב')} <input class="zoomPercent" id="zoomPercent" type="number" inputmode="numeric" min="50" max="500" step="5" value="${this.roofZoom}" aria-label="Roof zoom percent">%</label><button class="btn" id="zoomIn" title="Zoom in">+</button><button class="btn" id="zoomFit">${this.t('Вся крыша','Fit roof','התאמה לגג המלא')}</button><label class="compactToggle desktopOnly"><input type="checkbox" id="mobileCompact" ${this.data.settings.mobileCompact!==false?'checked':''}> ${this.t('Масштабировать маркеры с крышей','Scale markers with roof','שינוי גודל הסמנים יחד עם הגג')}</label></div><div class="editorMenu" ${this.editorOpen?'':'hidden'}><div class="actions"><button class="btn" id="discover">${this.t('Найти панели','Find panels','איתור פאנלים')}</button><button class="btn" id="addfound" ${this.found?.length?'':'disabled'}>${this.t('Добавить найденные','Add detected','הוספת הפאנלים שזוהו')} ${this.found?.length?'('+this.found.length+')':''}</button><button class="btn" id="add">+ ${this.t('Панель','Panel','פאנל')}</button><button class="btn" id="mapping" ${selected?'':'disabled'}>${this.t('Привязать датчик','Map sensor','שיוך חיישן')}</button><button class="btn danger" id="remove" ${selected?'':'disabled'}>${this.t('Удалить панель','Remove panel','מחיקת פאנל')}</button></div></div><div class="roofcontrols editorTools" ${this.editorOpen?'':'hidden'}><label class="btn file">📷 ${this.t('Загрузить фото','Upload photo','העלאת תמונה')}<input id="upload" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="actions"></div></div><div class="help">${this.edit?this.t('Перетаскивайте маркеры мышкой или пальцем. Позиция не меняет привязку к Tigo.','Drag markers with mouse or touch. Positions never change Tigo entity mapping.','גררו את סמני הפאנלים בעכבר או באצבע. שינוי המיקום אינו משנה את שיוך החיישנים.'):this.t('Нажмите на панель, чтобы увидеть её параметры.','Click a panel to see its details.','לחצו על פאנל להצגת הנתונים שלו.')}</div>
    ${this.editorOpen?`<section class="displaySettings summarySettings"><div class="sectionTitle">${this.t('Параметры статистики','Statistics metrics','מדדים לסטטיסטיקה')}</div><div class="help">${this.t('Здесь выбираются только показатели. Строки и панели выбираются непосредственно на Dashboard.','Choose metrics here; select strings and panels directly on the dashboard.','כאן בוחרים את המדדים בלבד. את הסטרינגים והפאנלים בוחרים ישירות בלוח הבקרה.')}</div><div class="fieldOptions">${['power','temperature','voltage_in','voltage_out','current_in','current_out','energy','rssi'].map(k=>`<label><input type="checkbox" data-summary-metric="${k}" ${(this.data.settings.summaryMetrics||[]).includes(k)?'checked':''}> ${this.fieldLabel(k)}</label>`).join('')}</div></section>`:''}
    ${this.settingsOpen?`<div class="displaySettings"><div class="sectionTitle">${this.t('Настройки отображения панелей','Panel display settings','הגדרות תצוגת הפאנלים')}</div><div class="scopeControls"><label>${this.t('Изменить','Apply to','החלה על')} <select id="displayScope"><option value="ALL" ${this.displayScope==='ALL'?'selected':''}>${this.t('Все панели','All panels','כל הפאנלים')}</option><option value="STRING" ${this.displayScope==='STRING'?'selected':''}>${this.t('Одну строку','One string','סטרינג אחד')}</option><option value="PANEL" ${this.displayScope==='PANEL'?'selected':''}>${this.t('Одну панель','One panel','פאנל אחד')}</option></select></label>${this.displayScope==='STRING'?`<label>${this.t('Строка','String','סטרינג')} <select id="displayTarget">${strings.map(v=>`<option value="${this.esc(v)}" ${v===this.displayTarget?'selected':''}>${this.esc(v)}</option>`).join('')}</select></label>`:''}${this.displayScope==='PANEL'?`<label>${this.t('Панель','Panel','פאנל')} <select id="displayTarget">${panels.map(v=>`<option value="${this.esc(v.id)}" ${v.id===this.displayTarget?'selected':''}>${this.esc(v.id)}</option>`).join('')}</select></label>`:''}</div><div class="sizeControls"><div class="sizeControl"><label for="markerWidth">${this.t('Ширина','Width','רוחב')}: <strong id="widthValue">${this.displayScope==='ALL'?this.data.settings.markerWidth:(this.editStyle().width??this.data.settings.markerWidth)} px</strong></label><input id="markerWidth" type="range" min="32" max="220" step="2" value="${this.displayScope==='ALL'?this.data.settings.markerWidth:(this.editStyle().width??this.data.settings.markerWidth)}"></div><div class="sizeControl"><label for="markerHeight">${this.t('Высота','Height','גובה')}: <strong id="heightValue">${this.displayScope==='ALL'?this.data.settings.markerHeight:(this.editStyle().height??this.data.settings.markerHeight)} px</strong></label><input id="markerHeight" type="range" min="28" max="180" step="2" value="${this.displayScope==='ALL'?this.data.settings.markerHeight:(this.editStyle().height??this.data.settings.markerHeight)}"></div></div><div class="scopeControls"><label>${this.t('Расположение','Layout','סידור הנתונים')} <select id="markerLayout"><option value="vertical" ${(this.displayScope==='ALL'?this.data.settings.markerLayout:(this.editStyle().layout??this.data.settings.markerLayout))==='vertical'?'selected':''}>${this.t('Вертикальное','Vertical','אנכי')}</option><option value="horizontal" ${(this.displayScope==='ALL'?this.data.settings.markerLayout:(this.editStyle().layout??this.data.settings.markerLayout))==='horizontal'?'selected':''}>${this.t('Горизонтальное','Horizontal','אופקי')}</option></select></label></div><label class="panelNameToggle"><input type="checkbox" id="showPanelNames" ${this.data.settings.showPanelNames!==false?'checked':''}> ${this.t('Показывать названия панелей (A01, B01...)','Show panel names (A01, B01...)','הצגת מזהי הפאנלים (A01, B01...)')}</label><div class="sectionTitle" style="font-size:14px;margin-top:14px">${this.t('Данные на маркерах (для всех панелей)','Marker data (all panels)','נתונים על סמני הפאנלים (לכל הפאנלים)')}</div><div class="fieldOptions">${['power','voltage_in','voltage_out','current_in','current_out','temperature','energy','rssi'].map(k=>`<label><input type="checkbox" data-marker-field="${k}" ${this.data.settings.markerFields.includes(k)?'checked':''}>${this.fieldLabel(k)}</label>`).join('')}</div><div class="scopeControls"><label><input id="rotateFields" type="checkbox" ${this.data.settings.rotateFields?'checked':''}>${this.t('Чередовать параметры, если больше','Rotate readings when more than','החלפת מדדים כאשר מוצגים יותר מ־')}</label><label>${this.t('Порог','Threshold','סף')} <select id="rotateThreshold">${[2,3,4].map(n=>`<option value="${n}" ${Number(this.data.settings.rotateThreshold||3)===n?'selected':''}>${n}</option>`).join('')}</select></label><label>${this.t('Интервал (сек.)','Interval (seconds)','מרווח החלפה (שניות)')} <input id="rotateSeconds" type="number" min="1" max="120" step="1" value="${this.data.settings.rotateSeconds||4}" style="width:70px"></label></div><div class="barSettings"><div class="sectionTitle" style="font-size:14px;margin-top:14px">${this.t('Bar graph (для всех панелей)','Bar graph (all panels)','מחוון עמודה (לכל הפאנלים)')}</div><div class="scopeControls"><label>${this.t('Датчик','Sensor','חיישן')} <select id="globalBarField"><option value="none" ${this.data.settings.barField==='none'?'selected':''}>${this.t('Выключено','Off','כבוי')}</option>${['power','voltage_in','voltage_out','current_in','current_out','temperature','energy','rssi'].map(k=>`<option value="${k}" ${this.data.settings.barField===k?'selected':''}>${this.fieldLabel(k)}</option>`).join('')}</select></label><label>${this.t('Минимум','Minimum','מינימום')} <input id="globalBarMin" type="number" step="any" value="${this.data.settings.barMin??0}"></label><label>${this.t('Максимум','Maximum','מקסימום')} <input id="globalBarMax" type="number" step="any" value="${this.data.settings.barMax??500}"></label></div><div class="help">${this.t('Один тип датчика для всех панелей; каждая панель использует собственную привязку. Отсутствующие датчики показывают пустую шкалу.','One sensor type for all panels; each panel uses its own mapped entity. Missing sensors show an empty bar.','אותו סוג מדד לכל הפאנלים; כל פאנל מציג את נתוני החיישן המשויך אליו. אם אין חיישן משויך, המחוון יישאר ריק.')}</div></div><div class="gradientSettings"><label><input type="checkbox" id="gradient" ${this.data.settings.gradient?'checked':''}>${this.t('Градиент по показаниям датчика','Sensor-based gradient','מדרג צבע לפי נתוני החיישן')}</label><div class="scopeControls"><label>${this.t('Показатель градиента','Gradient metric','מדד למדרג')} <select id="gradientField">${['power','voltage_in','voltage_out','current_in','current_out','temperature','energy','rssi'].map(k=>`<option value="${k}" ${this.data.settings.gradientField===k?'selected':''}>${this.fieldLabel(k)}</option>`).join('')}</select></label><label>${this.t('Цвет при минимуме','Low-value color','צבע לערך נמוך')} <input type="color" id="gradientColorLow" value="${/^#[0-9a-f]{6}$/i.test(this.data.settings.gradientColorLow||'')?this.data.settings.gradientColorLow:'#1e3a8a'}"></label><label>${this.t('Цвет при максимуме','High-value color','צבע לערך גבוה')} <input type="color" id="gradientColor" value="${/^#[0-9a-f]{6}$/i.test(this.data.settings.gradientColor||'')?this.data.settings.gradientColor:'#10b981'}"></label></div><div class="help">${this.t('Цвет плавно меняется от первого ко второму по значениям выбранного показателя среди панелей на связи.','Colors transition smoothly from the low-value color to the high-value color, using readings from online panels.','הצבע משתנה בהדרגה בין שני הצבעים לפי מדידות הפאנלים המחוברים בלבד.')}</div></div><div class="help">${this.t('Настройки применяются после нажатия OK.','Settings are saved when you press OK.','ההגדרות יחולו לאחר לחיצה על אישור.')}</div></div>`:''}
${this.editorOpen?`<div class="unifiedSave"><button class="btn primary" id="saveAll">${this.t('Сохранить все изменения','Save all changes','שמירת כל השינויים')}</button></div>`:''}</section>
    <section class="detail">${selected?`<div class="details"><h2>${this.esc(selected.id)}</h2><div class="muted">${this.t('Строка','String','סטרינג')} ${this.esc(selected.string)} · ${this.esc(Object.keys(selected.entities||{}).length)} ${this.t('датчиков','sensors','חיישנים')}</div><div class="readings">${[['power',this.t('Мощность','Power','הספק'),'W'],['voltage_in',this.t('Напряжение вход','Input voltage','מתח כניסה'),'V'],['voltage_out',this.t('Напряжение выход','Output voltage','מתח יציאה'),'V'],['current_in',this.t('Ток вход','Input current','זרם כניסה'),'A'],['current_out',this.t('Ток выход','Output current','זרם יציאה'),'A'],['temperature',this.t('Температура','Temperature','טמפרטורה'),'°C'],['energy',this.t('Энергия','Energy','אנרגיה מצטברת'),'kWh'],['rssi','RSSI','dBm'],['node_serial',this.t('Серийный номер оптимизатора','Optimizer serial number','מספר סידורי של האופטימייזר'),' ']].filter(([key])=>selected.entities?.[key]).map(([key,label,unit])=>{const textual=['timestamp','node_serial','gateway_address'].includes(key);const value=this.esc(textual?(this.val(selected,key)||'—'):this.fmt(this.num(selected,key))+(this.num(selected,key)===null?'':' '+unit));return `<div class="reading"><span>${label}</span><b ${textual?'':`data-live="${key}" data-panel="${this.esc(selected.id)}" data-unit=" ${unit}"`}>${value}</b></div>`;}).join('')||`<div class="muted">${this.t('Привяжите датчики панели','Map this panel’s sensors','יש לשייך חיישנים לפאנל')}</div>`}</div><div class="panelTrend"><div class="panelTrendTitle">${this.t('Тренд · последние 24 часа','Trend · last 24 hours','מגמה · 24 השעות האחרונות')}</div><div id="panelTrendChart" class="panelTrendChart"></div><div class="panelTrendLegend">${this.panelTrendMetrics(selected).map(([key,label,unit])=>`<button type="button" class="trendLegendBtn ${this.panelTrendSelection.includes(key)?'active':''}" data-panel-trend="${key}" aria-pressed="${this.panelTrendSelection.includes(key)?'true':'false'}" style="--trend-color:${this.trendColor(key)}"><i></i><span>${this.esc(label)}</span><small>${this.esc(unit)}</small></button>`).join('')}</div></div></div></div>`:`<div class="muted">${this.t('Найдите панели Tigo или добавьте их вручную.','Discover Tigo panels or add them manually.','אפשר לאתר פאנלים של Tigo או להוסיף אותם ידנית.')}</div>`}</section></div>`;
    const q=s=>this.shadowRoot.querySelector(s);q('#addWidgetGlobal')&&(q('#addWidgetGlobal').onclick=()=>this.openWidgetPicker('roof'));this.shadowRoot.querySelectorAll('[data-widget]').forEach(el=>el.onclick=()=>this.openWidgetPicker(el.dataset.widget));q('#editorToggle').onclick=()=>{const opening=!this.editorOpen;this.editorOpen=opening;this.edit=opening;this.settingsOpen=opening;if(opening&&!this.displayTarget)this.displayTarget=this.selected||panels[0]?.id||'';this.render();};q('#saveAll')&&(q('#saveAll').onclick=()=>this.save());q('#summaryAll')&&(q('#summaryAll').onclick=()=>{this.summarySelection={strings:[],panels:[]};this.render();});this.shadowRoot.querySelectorAll('[data-summary-pick-string]').forEach(el=>el.onchange=()=>{const v=el.dataset.summaryPickString;const current=new Set(this.summarySelection.strings);el.checked?current.add(v):current.delete(v);this.summarySelection.strings=[...current];this.render();});this.shadowRoot.querySelectorAll('[data-summary-pick-panel]').forEach(el=>el.onchange=()=>{const v=el.dataset.summaryPickPanel;const current=new Set(this.summarySelection.panels);el.checked?current.add(v):current.delete(v);this.summarySelection.panels=[...current];this._panelPickerOpen=true;this.render();});this.bindSummaryHistory();this.bindPanelTrend();this.shadowRoot.querySelectorAll('[data-summary-metric]').forEach(el=>el.onchange=()=>{this.data.settings.summaryMetrics=[...this.shadowRoot.querySelectorAll('[data-summary-metric]:checked')].map(x=>x.dataset.summaryMetric);this.shadowRoot.querySelector('.summaryDetail')?.remove();this.shadowRoot.querySelector('.strings')?.insertAdjacentHTML('afterend',this.summaryDetail());this.bindSummaryHistory();});q('#displayScope')&&(q('#displayScope').onchange=e=>{this.displayScope=e.target.value;this.displayTarget=this.displayScope==='STRING'?strings[0]||'':this.displayScope==='PANEL'?this.selected||panels[0]?.id||'':'';this.render();});q('#displayTarget')&&(q('#displayTarget').onchange=e=>{this.displayTarget=e.target.value;this.render();});for(const [key,field,label] of [['width','markerWidth','widthValue'],['height','markerHeight','heightValue']]){const input=q('#'+field);if(input)input.oninput=e=>{this.applyStyle(key,Number(e.target.value));q('#'+label).textContent=e.target.value+' px';this.renderMarkersOnly();};}q('#markerLayout')&&(q('#markerLayout').onchange=e=>{this.applyStyle('layout',e.target.value);this.renderMarkersOnly();});this.shadowRoot.querySelectorAll('[data-marker-field]').forEach(el=>el.onchange=()=>{this.data.settings.markerFields=[...this.shadowRoot.querySelectorAll('[data-marker-field]:checked')].map(x=>x.dataset.markerField);this.carouselIndex=0;this.render();});q('#globalBarField')&&(q('#globalBarField').onchange=e=>{this.data.settings.barField=e.target.value;this.render();});for(const [id,key] of [['globalBarMin','barMin'],['globalBarMax','barMax']]){q('#'+id)&&(q('#'+id).onchange=e=>{const v=Number(e.target.value),other=Number(this.data.settings[key==='barMin'?'barMax':'barMin']);if(!Number.isFinite(v)||Math.abs(v)>1e9||(key==='barMin'?v>=other:v<=other)){this.message=this.t('Максимум должен быть больше минимума','Maximum must exceed minimum','הערך המרבי חייב להיות גדול מהערך המזערי');this.render();return;}this.data.settings[key]=v;this.updateBars();});}q('#rotateFields')&&(q('#rotateFields').onchange=e=>{this.data.settings.rotateFields=e.target.checked;this.render();});q('#rotateThreshold')&&(q('#rotateThreshold').onchange=e=>{this.data.settings.rotateThreshold=Number(e.target.value);this.carouselIndex=0;this.render();});q('#rotateSeconds')&&(q('#rotateSeconds').onchange=e=>{this.data.settings.rotateSeconds=Math.max(1,Math.min(120,Number(e.target.value)||4));this.startRotation();});q('#showPanelNames')&&(q('#showPanelNames').onchange=e=>{this.data.settings.showPanelNames=e.target.checked;this.shadowRoot.querySelectorAll('.markerName').forEach(n=>n.hidden=!e.target.checked);this.fitMarkerText();});q('#gradient')&&(q('#gradient').onchange=e=>{this.data.settings.gradient=e.target.checked;this.updateMarkers();});q('#gradientField')&&(q('#gradientField').onchange=e=>{this.data.settings.gradientField=e.target.value;this.updateMarkers();});q('#gradientColorLow')&&(q('#gradientColorLow').oninput=e=>{this.data.settings.gradientColorLow=e.target.value;this.updateMarkers();});q('#gradientColor')&&(q('#gradientColor').oninput=e=>{this.data.settings.gradientColor=e.target.value;this.updateMarkers();});q('#zoomOut').onclick=()=>this.setRoofZoom(this.roofZoom-10);q('#zoomIn').onclick=()=>this.setRoofZoom(this.roofZoom+10);q('#zoomFit').onclick=()=>{this.roofZoom=100;this.fitRoofGeometry();const z=q('#zoomPercent');if(z)z.value=100;const v=q('.roofViewport');if(v){v.scrollLeft=0;v.scrollTop=0;}};q('#zoomPercent').onchange=e=>{this.setRoofZoom(Number(e.target.value)||100);e.target.value=this.roofZoom;};q('#mobileCompact')&&(q('#mobileCompact').onchange=e=>{this.data.settings.mobileCompact=e.target.checked;this.updateMobileScale();});this.setupZoom();q('#roof img')?.addEventListener('load',()=>this.fitRoofGeometry(),{once:true});this.fitRoofGeometry();this.fitMarkerText();q('#discover').onclick=()=>this.discover();q('#addfound').onclick=()=>this.addFound();q('#add').onclick=()=>this.addPanel();q('#language').onchange=e=>{this.language=e.target.value;this.render();};q('#upload').onchange=e=>this.upload(e.target.files[0]);q('#mapping')&&(q('#mapping').onclick=()=>this.editMapping());q('#remove')&&(q('#remove').onclick=()=>{if(confirm(this.t('Удалить панель?','Remove panel?','למחוק את הפאנל?'))){this.data.panels=this.data.panels.filter(p=>p.id!==this.selected);this.selected=this.data.panels[0]?.id||null;this.render();this.save();}});
    this.shadowRoot.querySelectorAll('[data-select]').forEach(el=>el.onclick=()=>this.select(el.dataset.select));this.shadowRoot.querySelectorAll('[data-filter]').forEach(el=>{el.onclick=()=>{const v=el.dataset.filter;if(v==='ALL'){this.summarySelection={strings:[],panels:[]};this.filter='ALL';}else{const chosen=new Set(this.summarySelection.strings);chosen.has(v)?chosen.delete(v):chosen.add(v);this.summarySelection.strings=[...chosen];this.filter=this.summarySelection.strings.length===1?this.summarySelection.strings[0]:'ALL';}this.render();};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};});this.shadowRoot.querySelectorAll('.marker').forEach(el=>{el.onclick=()=>{if(!this.drag)this.select(el.dataset.id);};el.onpointerdown=e=>{if(!e.target.closest('.resizeHandle'))this.startDrag(e,el);};el.querySelector('.resizeHandle')?.addEventListener('pointerdown',e=>this.startResize(e,el));});this.fitMarkerText();this.updateBars();this.startRotation();
  }
  startDrag(e,el){if(!this.edit)return;e.preventDefault();const roof=this.shadowRoot.querySelector('#roof'),p=this.data.panels.find(p=>p.id===el.dataset.id);if(!p)return;el.setPointerCapture(e.pointerId);let moved=false;const move=ev=>{moved=true;const r=roof.getBoundingClientRect();p.x=Math.round(Math.max(2,Math.min(98,(ev.clientX-r.left)/r.width*100))*100)/100;p.y=Math.round(Math.max(3,Math.min(97,(ev.clientY-r.top)/r.height*100))*100)/100;el.style.left=p.x+'%';el.style.top=p.y+'%';};const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);if(!moved)this.selected=p.id;this.drag=null;this.render();};el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);this.drag=p.id;}
}
if(!customElements.get(TIGO_PANEL_TAG))customElements.define(TIGO_PANEL_TAG,TigoSolarPanel);
for(const legacyTag of ['tigo-solar-panel','tigo-solar-panel-v2-23-10','tigo-solar-panel-v2-23-11']){
  if(!customElements.get(legacyTag))customElements.define(legacyTag,class extends TigoSolarPanel{});
}

// Optional independent Lovelace cards, backed by the same Tigo integration and settings.
class TigoSolarCard extends TigoSolarPanel {
  constructor(){super();this.cardConfig={view:'roof',size:100};this._cardResizeObserver=null;}
  connectedCallback(){
    if(typeof ResizeObserver!=='undefined'&&!this._cardResizeObserver){
      this._cardResizeObserver=new ResizeObserver(()=>{if(this.shadowRoot.querySelector('.roofViewport'))this.fitRoofGeometry();});
      this._cardResizeObserver.observe(this);
    }
  }
  disconnectedCallback(){super.disconnectedCallback();this._cardResizeObserver?.disconnect();this._cardResizeObserver=null;}
  setConfig(config){
    const view=config.view||'roof';
    if(!['roof','roof-wide','stats','detail','strings'].includes(view))throw new Error('Invalid Tigo card view');
    // Migrate existing grid configuration. The size slider controls the card's
    // OUTER grid dimensions; roofZoom is independent and always starts at 100%.
    const legacy=config.size===undefined&&config.columns!==undefined;
    const size=legacy?Math.round(Number(config.columns)/12*200):Number(config.size??100);
    this.cardConfig={...config,view,size:Math.max(50,Math.min(200,Number.isFinite(size)?size:100))};
    this.cardConfig.height=Math.round((view==='roof-wide'?660:320)*this.cardConfig.size/100);
    this.viewMode=view==='roof-wide'?'roof':view;
    this.roofZoom=100;
    if(config.panel)this.selected=config.panel;
    if(config.string)this.filter=config.string;
    if(this.loaded)this.render();
  }
  static getConfigElement(){return document.createElement('tigo-solar-card-editor');}
  static getStubConfig(){return {view:'roof',size:100};}
  getGridOptions(){
    const scale=this.cardConfig.size/100;
    const wide=this.cardConfig.view==='roof-wide';
    return {columns:wide?12:Math.max(2,Math.min(12,Math.round(6*scale))),rows:wide?Math.max(6,Math.min(12,Math.round(8*scale))):Math.max(2,Math.min(12,Math.round(5*scale))),min_columns:wide?12:2,min_rows:wide?6:2};
  }
  getCardSize(){return this.getGridOptions().rows;}
}
class TigoSolarCardEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config={view:'roof',size:100};}
  set hass(value){this._hass=value;}
  setConfig(config){
    const legacy=config.size===undefined&&config.columns!==undefined;
    const size=legacy?Math.round(Number(config.columns)/12*200):Number(config.size??100);
    this._config={...config,view:config.view||'roof',size:Math.max(50,Math.min(200,size||100))};
    this.render();
  }
  render(){
    const c=this._config;
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;font:14px var(--paper-font-body1_-_font-family,Arial);color:var(--primary-text-color)}
      label{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}
      select{width:100%;padding:10px;border:1px solid var(--divider-color,#aaa);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color)}
      .sizeRow{display:flex;align-items:center;gap:14px}.sizeRow input{flex:1;min-width:0;accent-color:var(--primary-color,#03a9f4)}
      output{min-width:52px;font-weight:700;font-variant-numeric:tabular-nums}
      p{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#666)}
    </style>
    <label>Раздел / View<select id="view">${['roof','roof-wide','stats','detail','strings'].map(v=>`<option value="${v}" ${v===c.view?'selected':''}>${{roof:'Карта крыши', 'roof-wide':'Карта крыши — на всю ширину',stats:'Общая статистика',detail:'Параметры панели',strings:'Строки'}[v]}</option>`).join('')}</select></label>
    <label>Размер всего виджета<div class="sizeRow"><input id="size" type="range" min="50" max="200" step="10" value="${c.size}"><output id="percent">${c.size}%</output></div></label>
    <p>Ползунок изменяет ширину и высоту всей карточки в сетке Dashboard, а не масштаб фотографии внутри неё. В Dashboard типа Sections размер ограничен доступными колонками; в других раскладках ширину определяет Home Assistant.</p>`;
    const notify=()=>this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...this._config}},bubbles:true,composed:true}));
    this.shadowRoot.querySelector('#view').addEventListener('change',e=>{this._config.view=e.target.value;notify();});
    this.shadowRoot.querySelector('#size').addEventListener('input',e=>{
      this._config.size=Number(e.target.value);this.shadowRoot.querySelector('#percent').textContent=e.target.value+'%';notify();
    });
  }
}
class TigoSolarWideRoofCard extends TigoSolarCard {
  constructor(){super();this.cardConfig={view:'roof-wide',size:100};this.viewMode='roof';}
  setConfig(config){super.setConfig({...config,view:'roof-wide'});}
  static getStubConfig(){return {view:'roof-wide',size:100};}
}
if(!customElements.get('tigo-solar-roof-wide'))customElements.define('tigo-solar-roof-wide',TigoSolarWideRoofCard);
if(!customElements.get('tigo-solar-card-editor'))customElements.define('tigo-solar-card-editor',TigoSolarCardEditor);
if(!customElements.get('tigo-solar-card'))customElements.define('tigo-solar-card',TigoSolarCard);
window.customCards=window.customCards||[];
if(!window.customCards.some(c=>c.type==='tigo-solar-card'))window.customCards.push({type:'tigo-solar-card',name:'Tigo Solar',description:'Tigo roof, statistics, panel detail or strings card'});
if(!window.customCards.some(c=>c.type==='tigo-solar-roof-wide'))window.customCards.push({type:'tigo-solar-roof-wide',name:'Tigo Solar — Full-width Roof',description:'Full-width roof map with proportional panel markers'});
