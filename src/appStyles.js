export const S=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');
:root{--bg:#0e1015;--card:#181b22;--card2:#1e2129;--card3:#252830;--bdr:rgba(255,255,255,.06);--orange:#f97316;--orange-dim:rgba(249,115,22,.12);--cyan:#0ea5e9;--cyan-dim:rgba(14,165,233,.1);--lav:#c4b5fd;--warm:#fde68a;--warm-dim:rgba(253,230,138,.1);--rose:#fda4af;--sky:#7dd3fc;--sky-dim:rgba(125,211,252,.1);--red:#f87171;--red-dim:rgba(248,113,113,.1);--green:#4ade80;--green-dim:rgba(74,222,128,.12);--amber:#fbbf24;--amber-dim:rgba(251,191,36,.1);--tx:#f0f0f5;--tx2:#9ca3b0;--tx3:#5c6370;--fi:'Inter',sans-serif;--fm:'JetBrains Mono',monospace;--fh:'Rajdhani',sans-serif;--r:16px;--rs:12px}
*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px}
body,html,#root{font-family:var(--fi);background:var(--bg);color:var(--tx);height:100%;overflow:hidden}
.app{height:100vh;display:flex;flex-direction:column;padding:10px;gap:10px;overflow:hidden}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:var(--card);border-radius:var(--r);flex-shrink:0}
.tb-l{display:flex;align-items:center;gap:14px}.tb-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tb-t{font-size:18px;font-weight:800;color:var(--tx);letter-spacing:-.5px}.tb-t span{color:var(--orange)}.tb-s{font-size:11px;color:var(--tx3);font-weight:500;letter-spacing:.5px}
.tb-r{display:flex;align-items:center;gap:12px}
.nav-pills{display:flex;gap:4px;background:var(--card2);border-radius:10px;padding:3px}
.nav-pill{padding:7px 20px;border:none;border-radius:8px;background:transparent;color:var(--tx3);font-size:12px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s;white-space:nowrap}.nav-pill:hover{color:var(--tx2)}.nav-pill.on{background:var(--orange);color:#0e1015}
.tb-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tx2);font-weight:600}.tb-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
.slide-vp{flex:1;overflow:hidden;position:relative;min-height:0}.slide-tk{display:flex;height:100%;transition:transform .45s cubic-bezier(.4,0,.2,1);will-change:transform}.slide-pg{min-width:100%;width:100%;height:100%;flex-shrink:0;overflow:hidden}
.campo-pg{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.relay-pg{height:100%;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.main{flex:1;display:grid;grid-template-columns:260px 1fr 330px;gap:10px;min-height:0;overflow:hidden}
.col{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:2px}
.ccol{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden}.ccol-top{flex:1 1 auto;min-height:200px;display:flex;flex-direction:column;overflow:hidden}
.ccol-mid{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex-shrink:0}.ccol-bot{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex-shrink:0}
.rcol{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;overflow-x:hidden}
.card{background:var(--card);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}.card-scroll{flex:1;min-height:0;overflow-y:auto}
.ph{padding:9px 14px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:var(--fh);display:flex;align-items:center;border-bottom:1px solid var(--bdr);flex-shrink:0}
.bar{width:4px;height:18px;border-radius:2px;margin-right:10px;flex-shrink:0}.bar-warm{background:var(--warm)}.bar-lav{background:var(--lav)}.bar-mint{background:var(--orange)}.bar-orange{background:var(--orange)}.bar-sky{background:var(--sky)}.bar-rose{background:var(--rose)}.bar-green{background:var(--green)}.ph-t{color:var(--tx)}
.cp{padding:12px 14px}.fr{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}.fg{display:flex;flex-direction:column;gap:3px}
.fl{font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.8px}
.ib{display:flex;align-items:center;background:var(--card2);border-radius:var(--rs);overflow:hidden;border:1px solid transparent}.ib:focus-within{border-color:rgba(249,115,22,.3);box-shadow:0 0 0 3px rgba(249,115,22,.08)}
.iu{padding:7px 9px;font-size:10px;color:var(--tx3);min-width:24px;text-align:center;font-family:var(--fm);background:rgba(0,0,0,.2);border-right:1px solid var(--bdr)}
.iv{background:transparent;border:none;color:var(--cyan);padding:7px 10px;font-size:13px;font-family:var(--fm);width:100%;outline:none;text-align:right;font-weight:600}.iv.warm{color:var(--warm)}
select.sl{background:var(--card2);border:1px solid transparent;color:var(--tx);padding:7px 10px;border-radius:var(--rs);font-size:11px;font-family:var(--fi);width:100%;outline:none;cursor:pointer;font-weight:500}
.conn-r{display:flex;gap:4px;margin-bottom:4px}.conn-b{flex:1;padding:6px;border:1px solid var(--bdr);background:var(--card2);color:var(--tx3);border-radius:var(--rs);cursor:pointer;font-size:11px;font-family:var(--fi);text-align:center;font-weight:600;transition:all .2s}.conn-b.on{background:var(--orange-dim);border-color:rgba(249,115,22,.25);color:var(--orange)}
.ratio{font-size:14px;font-weight:800;color:var(--cyan);font-family:var(--fm);text-align:center;padding:8px;margin-top:4px;background:var(--cyan-dim);border-radius:var(--rs)}.sep{height:1px;background:var(--bdr);margin:10px 0}
.wf-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center}
.wf-modal{background:var(--bg2);border:1px solid var(--bdr);border-radius:12px;padding:20px;width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.wf-title{font-size:14px;font-weight:700;color:var(--tx1);margin-bottom:14px;letter-spacing:1px;text-align:center}
.wf-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--bdr);border-radius:var(--rs);margin-bottom:6px;cursor:pointer;transition:all .15s;background:var(--card2)}
.wf-row:hover{border-color:var(--sky);background:rgba(125,211,252,.05)}
.wf-row.selected{border-color:var(--sky);background:var(--sky-dim);box-shadow:0 0 0 1px var(--sky)}
.wf-ts{font-size:12px;font-family:var(--fm);color:var(--tx2);flex:1}
.wf-stages{font-size:10px;color:var(--tx3);font-family:var(--fm)}
.wf-time{font-size:11px;color:var(--warm);font-weight:700;font-family:var(--fm)}
.wf-empty{font-size:12px;color:var(--tx3);text-align:center;padding:20px}
.wf-actions{display:flex;gap:8px;margin-top:14px;justify-content:flex-end}
.wf-btn{padding:8px 18px;border-radius:var(--rs);border:1px solid var(--bdr);background:var(--card2);color:var(--tx2);font-size:11px;font-family:var(--fi);cursor:pointer;transition:all .15s;font-weight:600}
.wf-btn:hover{border-color:var(--tx3);color:var(--tx1)}
.wf-btn.primary{background:var(--sky-dim);border-color:rgba(125,211,252,.3);color:var(--sky)}
.wf-btn.primary:hover{background:rgba(125,211,252,.15)}
.pd-open-btn{width:100%;padding:10px;border:1px solid rgba(249,115,22,.2);background:var(--orange-dim);color:var(--orange);border-radius:var(--rs);font-size:12px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all .2s;margin-top:4px}.pd-open-btn:hover{background:rgba(249,115,22,.18);border-color:rgba(249,115,22,.4)}
.pd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.pd-modal{background:var(--card);border:1px solid var(--bdr);border-radius:16px;width:920px;max-width:96vw;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.pd-header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--bdr);flex-shrink:0}
.pd-title{font-size:16px;font-weight:800;color:var(--tx);font-family:var(--fh);letter-spacing:1px;text-transform:uppercase;flex:1}
.pd-mode{font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;background:var(--orange-dim);color:var(--orange);letter-spacing:1px;font-family:var(--fm)}
.pd-close{background:transparent;border:1px solid var(--bdr);color:var(--tx3);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}.pd-close:hover{background:var(--red-dim);border-color:rgba(248,113,113,.3);color:var(--red)}
.pd-body{display:flex;gap:0;flex:1;min-height:0;overflow:hidden}
.pd-chart{padding:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pd-side{flex:1;overflow-y:auto;padding:12px 16px;border-left:1px solid var(--bdr);display:flex;flex-direction:column;gap:8px}
.pd-tabs{display:flex;gap:0;background:var(--card2);border-radius:8px;padding:2px;margin-bottom:4px}
.pd-section{background:var(--card2);border-radius:10px;padding:10px 12px}
.pd-sec-title{font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-family:var(--fm)}
.pd-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.pd-chk{width:16px;height:16px;border-radius:4px;border:2px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#0e1015;flex-shrink:0;transition:all .15s}
.pd-lbl{font-size:11px;font-weight:700;font-family:var(--fm);min-width:24px}
.pd-inp{background:var(--card3);border:1px solid var(--bdr);color:var(--cyan);padding:4px 6px;border-radius:6px;font-size:11px;font-family:var(--fm);width:82px;text-align:right;outline:none}.pd-inp:focus{border-color:rgba(14,165,233,.3)}
.pd-inp.pd-ang{width:66px;color:var(--warm)}
.pd-u{font-size:9px;color:var(--tx3);font-family:var(--fm);min-width:12px}
.pd-val{font-size:10px;color:var(--tx2);font-family:var(--fm);margin-left:auto;white-space:nowrap}
.pd-metric{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:10px;font-family:var(--fm)}.pd-metric span:first-child{color:var(--tx3)}.pd-metric span:last-child{color:var(--tx);font-weight:600}
.main-tabs{display:flex;gap:0;border-bottom:1px solid var(--bdr);flex-shrink:0;overflow-x:auto}
.mt{padding:9px 16px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:700;font-family:var(--fh);cursor:pointer;white-space:nowrap;letter-spacing:1px;text-transform:uppercase;border-bottom:3px solid transparent;transition:all .2s}.mt:hover{color:var(--tx2)}.mt.on{color:var(--orange);border-bottom-color:var(--orange);background:rgba(249,115,22,.04)}
.tbar{display:flex;gap:2px;padding:2px 4px;border-bottom:1px solid var(--bdr);overflow-x:auto;flex-shrink:0;background:rgba(0,0,0,.1)}
.ti{padding:7px 11px;border:none;background:transparent;color:var(--tx3);font-size:10px;font-weight:600;font-family:var(--fm);cursor:pointer;border-radius:6px;white-space:nowrap;transition:all .2s}.ti:hover{color:var(--tx2);background:rgba(255,255,255,.03)}.ti.on{color:var(--orange);background:var(--orange-dim)}
.stbar{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}.stb{padding:5px 12px;background:var(--card2);color:var(--tx3);border-radius:20px;cursor:pointer;font-size:10px;font-family:var(--fi);font-weight:600;border:1px solid transparent}.stb.on{background:var(--orange-dim);border-color:rgba(249,115,22,.2);color:var(--orange)}.stb.dis{opacity:.3}
.tw{display:flex;align-items:center;gap:10px;margin-bottom:8px}.tg{width:40px;height:22px;border-radius:11px;background:var(--card3);cursor:pointer;position:relative;border:none;padding:0}.tg.on{background:var(--orange)}.tg .dk{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .25s;box-shadow:0 1px 4px rgba(0,0,0,.3)}.tg.on .dk{left:20px}.tl{font-size:11px;color:var(--tx2);font-weight:500}
.pg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pi label{font-size:9px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.ctrl-r{display:flex;gap:8px}.ctrl-big{flex:1;padding:16px 8px;border-radius:var(--r);background:var(--card2);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid transparent;transition:all .2s}.ctrl-big:hover{border-color:rgba(255,255,255,.08);background:var(--card3)}.ctrl-big:active{transform:scale(.97)}.ctrl-big:disabled{opacity:.35;cursor:not-allowed;transform:none}
.ctrl-ico{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px}.ci-p{background:var(--green-dim);color:var(--green);border:2px solid rgba(74,222,128,.2)}.ci-s{background:var(--red-dim);color:var(--red);border:2px solid rgba(248,113,113,.2)}
.ctrl-lbl{font-size:10px;color:var(--tx2);font-weight:700;letter-spacing:1px;text-transform:uppercase}
.ctrl-sec{padding:10px;border-radius:var(--rs);background:var(--card2);cursor:pointer;font-size:11px;color:var(--tx2);text-align:center;font-weight:600;border:1px solid transparent;transition:all .2s}.ctrl-sec:hover{border-color:rgba(255,255,255,.08);color:var(--tx)}
.st-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.st-tt{font-size:14px;font-weight:700;color:var(--tx);font-family:var(--fh);text-transform:uppercase;letter-spacing:1px}
.st-pill{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700}.sp-idle{color:var(--tx3);background:var(--card3)}.sp-run{color:var(--green);background:var(--green-dim)}.sp-trip{color:var(--red);background:var(--red-dim)}
.tmr{background:var(--card2);border-radius:var(--rs);padding:12px;text-align:center}.tmr-l{font-size:9px;color:var(--tx3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;font-weight:600}.tmr-v{font-family:var(--fm);font-size:30px;font-weight:800;color:var(--tx);letter-spacing:2px}
.relay-wrap{padding:8px 10px 4px;background:var(--bg);flex:1;display:flex;flex-direction:column;min-height:0}
.relay-shell{background:#0e1015;border-radius:var(--r);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.07);display:flex;flex-direction:column;flex:1;min-height:0;transition:box-shadow .3s}
.relay-shell.tripped{box-shadow:0 0 0 2px rgba(249,115,22,.6),0 0 32px rgba(249,115,22,.2),inset 0 0 0 1px rgba(249,115,22,.15);animation:trip-pulse 1.2s ease-in-out infinite}
@keyframes trip-pulse{0%,100%{box-shadow:0 0 0 2px rgba(249,115,22,.6),0 0 32px rgba(249,115,22,.2),inset 0 0 0 1px rgba(249,115,22,.15)}50%{box-shadow:0 0 0 3px rgba(249,115,22,.9),0 0 52px rgba(249,115,22,.38),inset 0 0 0 1px rgba(249,115,22,.3)}}
.relay-strip{height:3px;background:linear-gradient(90deg,transparent,var(--orange),#c2410c,var(--orange),transparent);flex-shrink:0}
.relay-in{padding:10px 12px 8px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05)}
.relay-header{display:flex;align-items:flex-start;justify-content:space-between}
.relay-id{flex:1}.rbn{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--tx);font-family:var(--fh)}.rbm{font-size:7px;color:#3d4455;letter-spacing:1.5px;font-family:var(--fm)}
.relay-pwr{display:flex;align-items:center;gap:5px;margin-top:3px}.rpw-led{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}.rpw-lbl{font-size:6px;color:#3d4455;text-transform:uppercase;letter-spacing:1px;font-weight:700;font-family:var(--fm)}
.relay-st{display:flex;align-items:center;justify-content:space-between;padding:5px 12px;font-size:9px;font-weight:700;letter-spacing:1px;flex-shrink:0}
.rs-ok{background:rgba(74,222,128,.06);color:var(--green);border-top:1px solid rgba(74,222,128,.1);border-bottom:1px solid rgba(74,222,128,.08)}
.rs-trip{background:rgba(248,113,113,.08);color:var(--red);border-top:1px solid rgba(248,113,113,.15);border-bottom:1px solid rgba(248,113,113,.12);animation:bk .8s infinite}
@keyframes bk{0%,100%{opacity:1}50%{opacity:.4}}
.relay-lcd{background:#040806;border-bottom:1px solid rgba(0,255,80,.07);flex-shrink:0}
.lcd-nav{display:flex;align-items:center;justify-content:space-between;padding:3px 8px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(0,255,80,.05)}
.lcd-b{background:transparent;border:1px solid rgba(0,255,80,.18);color:rgba(0,210,65,.6);font-size:9px;padding:2px 7px;cursor:pointer;border-radius:3px;font-family:var(--fm);transition:all .15s;line-height:1}.lcd-b:hover{background:rgba(0,255,80,.07);color:rgba(0,255,80,.95);border-color:rgba(0,255,80,.35)}
.lcd-pg{font-size:8px;color:rgba(0,200,60,.5);font-family:var(--fm);letter-spacing:.5px;text-transform:uppercase;flex:1;text-align:center}
.lcd-content{padding:5px 10px 7px;min-height:72px}
.lcd-r{display:flex;justify-content:space-between;align-items:center;padding:1.5px 0}
.lcd-r .l{font-size:9px;color:rgba(0,185,55,.45);font-family:var(--fm);min-width:30px}
.lcd-r .v{font-size:10px;color:rgba(0,255,80,.9);font-family:var(--fm);letter-spacing:.3px;text-shadow:0 0 7px rgba(0,255,80,.35)}
.lcd-s{height:1px;background:rgba(0,255,80,.05);margin:3px 0}
.relay-tabs{display:flex;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05)}
.rtab{flex:1;padding:7px 2px;border:none;background:transparent;color:#3d4455;font-size:8px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:1.2px;text-transform:uppercase;transition:all .2s;border-bottom:2px solid transparent;margin-bottom:-1px}
.rtab:hover{color:#6b7280}.rtab.on{color:var(--cyan);border-bottom-color:var(--cyan);background:rgba(14,165,233,.04)}
.relay-panel{flex:1;overflow-y:auto;min-height:0}
.rp-section{padding:6px 10px}
.rp-stitle{font-size:7px;color:#3d4455;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-weight:700;font-family:var(--fh)}
.rp-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0}
.rp-lbl{font-size:9px;color:#4a5568;font-family:var(--fm)}.rp-val{font-size:10px;font-weight:600;color:var(--cyan);font-family:var(--fm)}
.rp-sep{height:1px;background:rgba(255,255,255,.04);margin:4px 0}
.rp-prot{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03)}.rp-prot:last-child{border-bottom:none}
.rp-pdot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.rp-plbl{font-size:9px;font-weight:700;color:var(--tx2);font-family:var(--fm);min-width:30px}
.rp-pname{font-size:8px;color:#4a5060;flex:1;font-family:var(--fi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-pst{font-size:7px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}.rp-pst.en{color:var(--green)}.rp-pst.dis{color:#2a2a35}.rp-pst.trip{color:var(--red)}
.rp-led-row{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03)}.rp-led-row:last-child{border-bottom:none}
.rp-led-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.rp-led-dot.off{background:radial-gradient(circle at 40% 35%,#252535,#111)}.rp-led-dot.on{background:radial-gradient(circle at 40% 35%,#ff8a80,#ff1744);box-shadow:0 0 6px #ff1744;animation:bk .6s infinite}
.rp-led-lbl{font-size:9px;font-weight:700;font-family:var(--fm);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-led-lbl.empty{color:#252535}.rp-led-lbl.on{color:#ccc}.rp-led-lbl.off{color:#3d4455}
.rp-led-st{font-size:7px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0}.rp-led-st.off{color:#252535}.rp-led-st.on{color:#ff4444}
.rp-evt{padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.03);display:flex;gap:5px;align-items:flex-start}.rp-evt:last-child{border-bottom:none}
.rp-evt-t{color:#3d4455;font-size:8px;white-space:nowrap;min-width:52px;font-family:var(--fm)}.rp-evt-x{color:#5c6370;font-size:8px;flex:1;line-height:1.4}
.rp-empty{padding:20px;text-align:center;color:#3d4455;font-size:8px;font-family:var(--fm);letter-spacing:1.5px;text-transform:uppercase}
.relay-bot{display:flex;justify-content:center;gap:6px;padding:6px 10px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}
.rbt{padding:4px 12px;border-radius:6px;font-size:8px;font-weight:700;cursor:pointer;border:1px solid;text-transform:uppercase;letter-spacing:.5px;transition:all .15s;font-family:var(--fm)}.rbt:active{transform:scale(.94)}
.rr{background:rgba(120,53,0,.5);color:#fbbf24;border-color:rgba(251,191,36,.3)}.r0{background:rgba(127,29,29,.5);color:#fca5a5;border-color:rgba(248,113,113,.25)}.rii{background:rgba(20,83,45,.5);color:#86efac;border-color:rgba(74,222,128,.25)}
.rfo{text-align:center;padding:2px 6px 4px;flex-shrink:0}.rfb{font-size:6px;color:#1e2230;letter-spacing:2px;font-family:var(--fm);text-transform:uppercase}
.relay-actions{display:flex;gap:8px;padding:6px 10px 2px;flex-shrink:0}
.rp-mensuracao{display:flex;height:100%;overflow:hidden}.rp-subnav{display:flex;flex-direction:column;width:38px;border-right:1px solid rgba(255,255,255,.05);flex-shrink:0;padding:4px 0;gap:2px;background:rgba(0,0,0,.15)}.rp-snb{padding:8px 2px;border:none;background:transparent;color:#3d4455;font-size:7px;font-weight:700;font-family:var(--fh);cursor:pointer;letter-spacing:.8px;text-align:center;text-transform:uppercase;transition:all .2s;border-left:2px solid transparent;line-height:1.3}.rp-snb:hover{color:#6b7280}.rp-snb.on{color:var(--cyan);background:rgba(14,165,233,.06);border-left-color:var(--cyan)}.rp-mensuracao-content{flex:1;overflow-y:auto;min-width:0}
.ra-btn{flex:1;padding:10px 4px;border-radius:var(--rs);background:var(--card2);border:1px solid transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s}.ra-btn:hover{border-color:rgba(255,255,255,.1);background:var(--card3)}.ra-btn:active{transform:scale(.96)}
.ra-ico{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700}
.ra-ico.send{background:var(--orange-dim);color:var(--orange);border:2px solid rgba(249,115,22,.2)}.ra-ico.get{background:var(--sky-dim);color:var(--sky);border:2px solid rgba(125,211,252,.2)}.ra-ico.wave{background:var(--amber-dim);color:var(--amber);border:2px solid rgba(251,191,36,.2)}
.ra-lbl{font-size:8px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;text-align:center;line-height:1.2}
.ra-btn.flash-g{border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.08)}.ra-btn.flash-b{border-color:rgba(125,211,252,.4);background:rgba(125,211,252,.08)}
.ev-box{max-height:140px;overflow-y:auto;background:var(--card2);border-radius:var(--rs);padding:8px}
.ev-e{padding:5px 0;border-bottom:1px solid var(--bdr);display:flex;gap:6px;align-items:flex-start}.ev-e:last-child{border-bottom:none}
.ev-t{color:var(--tx3);font-size:9px;white-space:nowrap;min-width:62px;font-family:var(--fm)}.ev-i{font-size:10px}.ev-x{color:var(--tx2);font-size:9px;flex:1}.ev-d{color:var(--tx3);font-size:8px;white-space:nowrap;font-family:var(--fm)}
.dg-box{max-height:140px;overflow-y:auto}.dt{width:100%;border-collapse:collapse;font-size:9px}
.dt th{text-align:left;padding:5px 6px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--bdr);font-size:8px}
.dt td{padding:5px 6px;border-bottom:1px solid var(--bdr);color:var(--tx2)}.dt tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:8px;font-weight:700}.b-enabled{background:var(--orange-dim);color:var(--orange)}.b-disabled{color:var(--tx3);background:var(--card3)}.b-trip{background:var(--red-dim);color:var(--red)}
.fh{display:flex;align-items:center;justify-content:space-between;padding:4px 0;margin-bottom:4px}.fn{font-size:12px;font-weight:700;color:var(--tx)}
.bs{margin-bottom:8px}.bs label{font-size:9px;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
.placeholder{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--tx3);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
.mx-wrap{overflow:auto;max-height:100%;padding:8px}.mx{border-collapse:separate;border-spacing:0;font-family:var(--fm);width:max-content}
.mx th,.mx td{padding:6px 10px;text-align:center;white-space:nowrap}
.mx th{background:var(--card3);color:var(--tx2);font-weight:700;font-size:10px;letter-spacing:.5px;text-transform:uppercase;position:sticky;top:0;z-index:2;border-bottom:2px solid var(--bdr)}
.mx th.corner{background:var(--card);z-index:3;text-align:left;color:var(--tx3);font-size:9px}.mx th.col-bo{color:var(--orange);font-size:11px}.mx th.col-led{color:var(--amber);font-size:11px}
.mx td.row-label{text-align:left;font-weight:700;color:var(--tx);background:var(--card2);position:sticky;left:0;z-index:1;font-size:10px;border-right:1px solid var(--bdr)}.mx td.row-label.is-bi{color:var(--sky)}.mx td.row-label.is-prot{color:var(--rose)}
.mx td{border-bottom:1px solid rgba(255,255,255,.03)}.mx tr:hover td{background:rgba(255,255,255,.02)}
.mx-section td{background:var(--card3)!important;color:var(--tx3);font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;text-align:left!important;padding:8px 10px!important}
.mx-cell{display:flex;align-items:center;justify-content:center}.mx-chk{width:16px;height:16px;border-radius:4px;border:2px solid var(--card3);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.mx-chk:hover{border-color:var(--tx3)}.mx-chk.on{background:var(--orange);border-color:var(--orange)}.mx-chk.on::after{content:'✓';color:#0e1015;font-size:10px;font-weight:800;line-height:1}
@media(max-width:1100px){.main{grid-template-columns:1fr 1fr}.rcol{grid-column:1/-1}}@media(max-width:768px){.main{grid-template-columns:1fr}}
.tp-strip{display:flex;align-items:center;gap:5px;padding:5px 8px;border-bottom:1px solid var(--bdr);background:rgba(249,115,22,.025);flex-shrink:0;overflow-x:auto;flex-wrap:nowrap;}
.tp-lbl{font-size:9px;color:var(--tx3);letter-spacing:2px;font-family:var(--fm);white-space:nowrap;flex-shrink:0;padding-right:4px;}
.tp-btn{padding:4px 10px;border:1px solid var(--bdr);background:var(--card2);color:var(--tx2);border-radius:6px;font-size:10px;font-weight:700;font-family:var(--fm);cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0;}
.tp-btn:hover{border-color:rgba(249,115,22,.45);color:var(--orange);background:var(--orange-dim);}
`;
